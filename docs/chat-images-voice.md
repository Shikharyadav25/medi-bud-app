# Image questions and optional voice dictation

## Web chat

Open **Ask Medi Bud**, expand **Attach a report or meal image**, select a JPEG/PNG, write your question, and explicitly agree to image processing. Sending analyzes the attached image and question only; unrelated saved account records are not transmitted. The image remains attached for follow-up questions until removed. Each Send is a new AI request. For PDFs, use the existing Reports upload/review flow instead.

- Reports: readable lab values are proposed, never automatically confirmed. **Save report for review** stores the normalized original and proposed observations. Open Reports, check/edit every value, then confirm/save before account chat can use them as reviewed evidence.
- Meals: food, portions and nutrition are approximate. **Save reviewed meal estimate** adds an explicitly estimated meal to server history and future account context. Do not save an inaccurate result; log it manually instead. No photo can establish allergy safety.
- Other/unclear images: no saved context candidate is created. Body/diagnostic images must not be treated as diagnoses or reassurance that there is no danger.

Nothing is automatically added to profile, reports or meal history. Validated report/meal results have private temporary drafts, encrypted when the server encryption key is configured (mandatory in production). Drafts expire after one hour: saving rejects expired IDs immediately; background cleanup removes expired drafts within the next minute while the API is running, and at startup after downtime. Discard removes a draft immediately. Saving removes the temporary image/result, retaining only a short-lived idempotency receipt; saved report originals remain until report/account deletion, while meal originals are discarded. Account export and account deletion include private drafts. Deployment backups have their own retention policy; deletion from live storage does not promise immediate backup or AI-provider deletion. Unclear/other images and failed requests have no persistent draft. Image conversation text stays in the current browser page, not server chat history.

Uploads require signed-in owner authentication, explicit consent, valid decoded JPEG/PNG, <=10 MB and <=16 megapixels. Camera metadata is stripped before provider submission. Server AI/IP/user quotas and a ten-draft/receipt-per-account cap apply. Transactions make saving idempotent. No arbitrary image URLs are fetched.

## Server settings

Use the same `GEMINI_API_KEY` / `GEMINI_MODEL`, `GROQ_API_KEY`, `CHAT_PROVIDER` and permission-controlled `CHAT_FALLBACK_PROVIDER` described in [chat-auth-care-setup.md](chat-auth-care-setup.md). Groq **image chat** uses the separate vision-capable `GROQ_VISION_MODEL=qwen/qwen3.8-27b`, not the text-only chat model. Provider/model access and quotas depend on your account. See [Groq vision API documentation](https://console.groq.com/docs/vision) and [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding). Existing standalone mobile meal/report routes retain their Gemini behavior; this change adds image attachment UI to web chat and a reusable authenticated API, not native mobile attachment UI.

The isolated demo deliberately disables external AI unless launched with `.venv/bin/python scripts/demo.py --enable-ai`. Configure keys locally in `services/api/.env`, never browser variables or chat. Missing credentials produce an explicit error and no invented image analysis. External provider fallback is allowed only with the additional consent and transient/unconfigured/rate-limit errors, never to bypass safety refusals or invalid credentials.

## Voice input

Expand **Voice input (optional)**. Supported secure-context browsers show English (India)/Hindi dictation, consent and start/stop controls. Unsupported browsers explain how to continue typing or use keyboard dictation. Microphone access is user-initiated; nothing records on load. Dictation stops automatically after 45 seconds, during message sending, or when the page unmounts. Resulting text is editable and never auto-sent. The browser permission still must be granted by the user.

The browser/vendor speech service may process audio externally, depending on the browser; this is disclosed before starting. Medi Bud does not receive or store audio. Browser support, service access, language availability and microphone permissions vary. See [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). No microphone or voice-recognition accuracy test was performed using the user's audio.

These guardrails and passing software tests are not independent clinical validation or approval for clinical use.
