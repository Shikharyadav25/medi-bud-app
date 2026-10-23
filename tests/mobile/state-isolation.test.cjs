const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Run the actual store modules with deterministic async boundary mocks. These
// tests check state ownership, not native Keychain/Keystore behavior.
function loadStore(file, mocks) {
  const filename = path.join(__dirname, "../../apps/mobile/src/store", file);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === "zustand")
      return {
        create: (initialize) => {
          let state;
          const set = (updates) => {
            state = { ...state, ...updates };
          };
          state = initialize(set, () => state);
          return { getState: () => state, setState: set };
        },
      };
    if (name in mocks) return mocks[name];
    throw new Error("Unexpected import: " + name);
  };
  vm.runInNewContext(
    "(function(require,module,exports){" + code + "\n})",
    {},
    { filename },
  )(requireMock, module, module.exports);
  return module.exports;
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function healthHarness(storage, api = async () => []) {
  let owner = "account-a";
  const writes = [];
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: owner ? { user: { id: owner } } : null },
      }),
    },
  };
  const exports = loadStore("useHealthStore.ts", {
    "../services/privateStorage": {
      privateStorage: {
        getItem: storage,
        setItem: async (key, value) => {
          writes.push({ key, value });
        },
      },
    },
    "../services/supabase": { supabase },
    "../services/api/client": { apiClient: api },
  });
  return {
    store: exports.useHealthStore,
    setOwner: (value) => {
      owner = value;
    },
    supabase,
    writes,
    flush: exports.flushHealthWrites,
  };
}

test("a delayed session lookup cannot save a prior snapshot under a new owner", async () => {
  const { store, supabase, writes, flush } = healthHarness(async () => null);
  await store.getState().loadStoredHealth();
  const session = deferred();
  supabase.auth.getSession = () => session.promise;
  store.getState().addWater(250);
  session.resolve({ data: { session: { user: { id: "account-b" } } } });
  await flush();
  assert.equal(writes.length, 0);
});

test("daily journal rollover resets daily entries but retains reports", () => {
  const { store } = healthHarness(async () => null);
  store.setState({
    journalDate: "1900-01-01",
    waterIntakeMl: 250,
    recentMeals: [{ id: "yesterday-meal" }],
    reports: [{ id: "retained-report" }],
    workouts: [{ id: "walk", completed: true }],
  });
  store.getState().refreshJournalDay();
  assert.equal(store.getState().waterIntakeMl, 0);
  assert.equal(store.getState().recentMeals.length, 0);
  assert.equal(store.getState().workouts[0].completed, false);
  assert.equal(store.getState().reports[0].id, "retained-report");
});

test("reset invalidates an in-flight health-cache hydration", async () => {
  const cache = deferred(),
    started = deferred();
  const { store } = healthHarness(() => {
    started.resolve();
    return cache.promise;
  });
  const loading = store.getState().loadStoredHealth();
  await started.promise;
  store.getState().resetForNewUser();
  cache.resolve(
    JSON.stringify({
      waterIntakeMl: 999,
      savedDate: new Date().toLocaleDateString("en-CA"),
    }),
  );
  await loading;
  assert.equal(store.getState().waterIntakeMl, 0);
});

test("changing accounts discards the previous owner cache", async () => {
  const cache = deferred(),
    started = deferred();
  const { store, setOwner } = healthHarness(() => {
    started.resolve();
    return cache.promise;
  });
  const loading = store.getState().loadStoredHealth();
  await started.promise;
  setOwner("account-b");
  cache.resolve(
    JSON.stringify({
      waterIntakeMl: 999,
      savedDate: new Date().toLocaleDateString("en-CA"),
    }),
  );
  await loading;
  assert.equal(store.getState().waterIntakeMl, 0);
});

test("a late reports response cannot repopulate a reset account", async () => {
  const response = deferred(),
    started = deferred();
  const { store, setOwner } = healthHarness(
    async () => null,
    () => {
      started.resolve();
      return response.promise;
    },
  );
  const loading = store.getState().loadStoredHealth();
  await started.promise;
  store.getState().resetForNewUser();
  setOwner("account-b");
  response.resolve([{ id: "private-account-a-report" }]);
  await loading;
  assert.equal(store.getState().reports.length, 0);
});

test("sign-out invalidates delayed profile hydration and clears identity", async () => {
  const cache = deferred(),
    started = deferred();
  const health = { resetForNewUser() {}, loadStoredHealth: async () => {} };
  const exports = loadStore("useAuthStore.ts", {
    "@react-native-async-storage/async-storage": {
      default: { multiRemove: async () => {} },
    },
    "../services/supabase": {
      isSupabaseConfigured: true,
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: "account-a", user_metadata: {} } } },
          }),
        },
      },
    },
    "../services/privateStorage": {
      privateStorage: {
        getItem: () => {
          started.resolve();
          return cache.promise;
        },
      },
    },
    "./useHealthStore": {
      useHealthStore: { getState: () => health },
      flushHealthWrites: async () => {},
    },
    "./useChatStore": {
      useChatStore: { getState: () => ({ clearMessages() {} }) },
    },
  });
  const store = exports.useAuthStore;
  const loading = store.getState().loadStoredProfile();
  await started.promise;
  store.getState().resetSession();
  cache.resolve(
    JSON.stringify({
      id: "account-a",
      name: "Previous account",
      onboardingCompleted: true,
    }),
  );
  await loading;
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(store.getState().profile.id, "");
  assert.equal(store.getState().hasHydrated, true);
});
