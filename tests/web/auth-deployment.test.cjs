const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, imports = {}, globals = {}) {
  const filename = path.join(__dirname, "../../apps/web/src", file);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    "(function(require,module,exports){" + code + "\n})",
    { URL, atob, AbortSignal, process: { env: {} }, ...globals },
    { filename },
  )(
    (name) => {
      if (name in imports) return imports[name];
      throw Error("Unexpected import: " + name);
    },
    module,
    module.exports,
  );
  return module.exports;
}
const { resolvePublicConfig } = load("lib/publicConfig.ts");
const key = "sb_publishable_test_only_not_a_real_key_12345";
const jwt = (role) =>
  "header." +
  Buffer.from(JSON.stringify({ role })).toString("base64url") +
  ".signature";

test("missing production settings never point requests at visitor localhost", () => {
  const config = resolvePublicConfig({ production: true });
  assert.equal(config.apiBaseUrl, "/api");
  assert.equal(config.authConfigured, false);
  assert.equal(config.apiConfigured, false);
});
test("supports public publishable and legacy anon keys", () => {
  for (const supabaseKey of [key, jwt("anon")]) {
    const config = resolvePublicConfig({
      production: true,
      supabaseUrl: "https://project.supabase.co/",
      supabaseKey,
      apiUrl: "https://api.example.com/",
    });
    assert.equal(config.authConfigured, true);
    assert.equal(config.supabaseKey, supabaseKey);
    assert.equal(config.apiBaseUrl, "https://api.example.com");
  }
});
test("privileged and malformed public keys fail builds without echoing credentials", () => {
  for (const supabaseKey of [
    "sb_secret_test_private_123456789",
    jwt("service_role"),
    jwt("authenticated"),
    "not-a-key",
  ]) {
    assert.throws(
      () => resolvePublicConfig({ production: true, supabaseKey }),
      (error) =>
        !error.message.includes(supabaseKey) &&
        error.message.includes("public"),
    );
  }
});
test("rejects loopback, credentials, non-HTTPS and path/query configuration in production", () => {
  for (const url of [
    "http://example.com",
    "http://127.0.0.1:8000",
    "https://localhost",
    "https://user:pass@example.com",
    "https://example.com/api",
    "https://example.com?token=private",
    "https://example.com/#x",
    "/api",
    "not a url",
  ]) {
    assert.throws(() => resolvePublicConfig({ production: true, apiUrl: url }));
    assert.throws(() =>
      resolvePublicConfig({ production: true, supabaseUrl: url }),
    );
  }
  assert.equal(
    resolvePublicConfig({ apiUrl: "http://127.0.0.1:8000" }).apiConfigured,
    true,
  );
});
test("a URL alone is not a connected authentication service", () => {
  const config = resolvePublicConfig({
    production: true,
    supabaseUrl: "https://project.supabase.co",
  });
  assert.equal(config.authConfigured, false);
  assert.equal(config.supabaseKey, "demo_anon_key");
});

test("an unused legacy public-key variable cannot hide a privileged key", () => {
  assert.throws(() =>
    load(
      "lib/publicConfig.ts",
      {},
      {
        process: {
          env: {
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("service_role"),
          },
        },
      },
    ),
  );
});

function sessionHarness({ configured = true, production = true } = {}) {
  let resolveSession;
  let nextSession = new Promise((resolve) => {
    resolveSession = resolve;
  });
  let authListener;
  let options;
  const auth = {
    getSession: () => nextSession,
    onAuthStateChange: (fn) => {
      authListener = fn;
    },
  };
  const exports = load(
    "lib/supabase.ts",
    {
      "@supabase/supabase-js": {
        createClient: (_url, _key, config) => {
          options = config;
          return { auth };
        },
      },
      "./publicConfig": {
        publicConfig: {
          authConfigured: configured,
          supabaseUrl: "https://project.supabase.co",
          supabaseKey: key,
        },
      },
    },
    {
      window: {},
      process: {
        env: {
          NODE_ENV: production ? "production" : "development",
          NEXT_PUBLIC_DEMO_MODE: "true",
        },
      },
      localStorage: { getItem: () => "demo_jwt_token" },
      fetch: async (_url, opts) => ({ signal: opts.signal }),
    },
  );
  return {
    ...exports,
    emit: (owner) =>
      authListener?.("SIGNED_IN", owner ? { user: { id: owner } } : null),
    resolve: (owner) =>
      resolveSession({
        data: {
          session: owner
            ? { user: { id: owner }, access_token: "token-" + owner }
            : null,
        },
      }),
    next: (owner) => {
      nextSession = Promise.resolve({
        data: {
          session: owner
            ? { user: { id: owner }, access_token: "token-" + owner }
            : null,
        },
      });
    },
    options: () => options,
  };
}
test("an in-flight token lookup cannot adopt a newly switched account", async () => {
  const h = sessionHarness();
  h.emit("a");
  const token = h.getCurrentAccessToken();
  h.emit("b");
  h.resolve("b");
  assert.equal(await token, null);
  h.next("b");
  assert.equal(await h.getCurrentAccessToken(), "token-b");
});
test("real auth failures never downgrade to the shared development demo", async () => {
  const h = sessionHarness({ production: false });
  h.resolve(null);
  assert.equal(await h.getCurrentAccessToken(), null);
});
test("production rejects a leftover demo token", async () => {
  const h = sessionHarness({ configured: false });
  h.resolve(null);
  assert.equal(await h.getCurrentAccessToken(), null);
});
test("Supabase requests respect cancellation and have a bounded timeout signal", async () => {
  const h = sessionHarness();
  const controller = new AbortController();
  controller.abort();
  const response = await h
    .options()
    .global.fetch("https://project.supabase.co/auth/v1/settings", {
      signal: controller.signal,
    });
  assert.equal(response.signal.aborted, true);
  const bounded = await h
    .options()
    .global.fetch("https://project.supabase.co/auth/v1/settings");
  assert.ok(bounded.signal instanceof AbortSignal);
});

test("private pages remount on account switches and reject a delayed previous session", async () => {
  let state;
  let effect;
  let listener;
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const jsx = (type, props, key) => ({ type, props, key });
  const { AccountBoundary } = load("components/AccountBoundary.tsx", {
    react: {
      useState: (initial) => {
        state ??= initial;
        return [
          state,
          (value) => {
            state = value;
          },
        ];
      },
      useEffect: (fn) => {
        effect ||= fn;
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/link": { default: "link" },
    "next/navigation": { usePathname: () => "/reports" },
    "@/lib/supabase": {
      isSupabaseConfigured: true,
      supabase: {
        auth: {
          getSession: () => pending,
          onAuthStateChange: (fn) => {
            listener = fn;
            return { data: { subscription: { unsubscribe() {} } } };
          },
        },
      },
    },
  });
  const render = () => AccountBoundary({ children: "PRIVATE CONTENT" });
  assert.equal(render().props.role, "status");
  effect();
  listener("SIGNED_IN", { user: { id: "account-a" } });
  assert.equal(render().key, "account-a");
  listener("SIGNED_IN", { user: { id: "account-b" } });
  assert.equal(render().key, "account-b");
  resolve({ data: { session: { user: { id: "account-a" } } } });
  await pending;
  await Promise.resolve();
  assert.equal(render().key, "account-b");
  listener("SIGNED_OUT", null);
  assert.notEqual(render().type, "div");
  assert.ok(!JSON.stringify(render()).includes("PRIVATE CONTENT"));
});
