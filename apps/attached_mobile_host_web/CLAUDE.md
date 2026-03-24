# attached_mobile_host_web

React Native 모바일 앱과 `oko_attached` iframe 사이의 **Generic RPC 브릿지** 역할을 하는
Next.js 웹 앱. OS 브라우저(iOS ASWebAuthenticationSession / Android AuthTabIntent)에서
열리며, 일반 dapp과 동일한 방식으로 `oko_attached`를 cross-origin iframe으로 로드한다.

## 설계 목표

- `attached_mobile_host_web`은 일반 dapp과 같은 형태로 `oko_attached`를 iframe으로 가진다.
- 앱에서 `{method, args}` 형태로 파라미터를 전달하면, iframe이 init된 후 해당 method를
  args와 함께 실행한다.
- 실행 결과를 적절한 형태로 앱에 반환한다.
- 앱 ↔ `attached_mobile_host_web` 간 `Uint8Array`, `bigint` 등 JSON으로 직접 전달할 수 없는
  타입은 공통 코덱으로 인코딩/디코딩한다.
- Sign-in/up은 OAuth 리다이렉트, keygen 등 특수한 로직이 필요하므로 generic RPC와
  별도로 처리한다.
- 여기서 RPC는 백엔드 서버를 경유하는 remote RPC가 아니다. 앱 ↔ `attached_mobile_host_web` ↔
  iframe 간의 **로컬 통신**만으로 완결되며, 별도의 백엔드 API 호출 없이 URL 인코딩과
  postMessage, scheme redirect만으로 요청과 결과를 주고받는다. `attached_mobile_host_web`은
  순수한 정적 웹 페이지로서 클라이언트 사이드에서만 동작한다.

## 통신 흐름

### Generic RPC (`/mobile/rpc`)

```
RN App
  │  openAuthSession("/mobile/rpc?method=open_modal&...#v=1&p=<encoded>")
  ▼
attached_mobile_host_web (OS 브라우저)
  │  1. URL에서 method + encoded payload 파싱
  │  2. oko_attached iframe 로드 (https://attached.oko.app, cross-origin)
  │  3. iframe init 메시지 수신 → init_ack 응답
  │  4. iframe에 postMessage(method, payload) 전달
  │  5. 결과를 scheme redirect URL로 인코딩하여 앱에 반환
  ▼
RN App
  │  callback URL에서 결과 디코딩
```

### Sign-in (`/mobile/login`)

OAuth 인증 → 콜백 → keygen이라는 다단계 플로우를 가지므로 별도 페이지에서 처리:

- `/mobile/login` — OAuth URL 생성 후 provider로 리다이렉트 (또는 Auth0 직접 리다이렉트)
- `/mobile/login/complete` — OAuth 콜백 수신 → iframe에 토큰 전달 → keygen 대기 →
  wallet info를 scheme redirect로 반환

## 구현 상세

### RPC 코덱 (공통 인코딩/디코딩)

RN SDK 측(`sdk/oko_sdk_core_react_native/src/codec/rpc_codec.ts`)과
프록시 웹 측(`src/app/mobile/_shared/rpc_codec.ts`)에 동일한 로직의 코덱이 존재한다.
두 환경(RN vs 브라우저)의 런타임이 달라 패키지 공유가 어려우므로 각각 배치하되
인코딩 형식은 동일하게 유지한다.

**인코딩 파이프라인:** `value → tagged types → JSON → pako deflateRaw → base64url`

**Tagged types** (JSON으로 직접 표현할 수 없는 타입 처리):
- `bigint` → `{ __oko_t: "bigint", value: "123" }`
- `Uint8Array` → `{ __oko_t: "u8", value: "<base64url>" }`

**URL 형식:**
- 요청: `/mobile/rpc?method=<method>&redirect_scheme=<scheme>&host_origin=...&api_key=...#v=1&p=<encoded_payload>`
- 결과: `<scheme>://?v=1&r=<encoded_result>`

payload는 URL fragment(`#`)에 넣어 서버로 전송되지 않도록 한다.

### Cross-origin iframe

iframe은 `https://attached.oko.app`에서 로드되며 cross-origin으로 동작한다.
이는 웹 SDK의 동작 방식과 동일하다.

- **`build_iframe_src.ts`** — `ATTACHED_ORIGIN` 상수와 iframe src URL 빌드
- **`send_to_attached.ts`** — `MessageChannel`을 사용한 cross-origin postMessage 통신.
  `ATTACHED_ORIGIN`을 targetOrigin으로 지정
- **`use_attached_init.ts`** — iframe의 `init` 메시지를 수신하고 `init_ack`로 응답하는 hook.
  `event.origin === ATTACHED_ORIGIN` 검증

### RPC Client (`/mobile/rpc/_client.tsx`)

- URL에서 method와 encoded payload를 파싱
- iframe init 대기 후 `sendToAttached(method, payload)` 호출
- `VISIBLE_METHODS` set에 포함된 method(`open_modal`, `__export_private_key__`)는
  iframe을 화면에 표시 (사용자 상호작용이 필요한 UI)
- 그 외 method는 iframe을 숨긴 채 처리 후 즉시 결과 반환
- 결과를 `buildRpcCallbackUrl(redirectScheme, result)`로 인코딩하여 `window.location.replace`

### Stale session cleanup

RN SDK의 `signOut()`은 앱 로컬 state만 지우고, attached iframe의 localStorage
(Zustand persist store — key share, auth token 등)는 건드리지 않는다. signOut 시점에
OS 브라우저를 여는 것은 UX가 나쁘므로, **다음 RPC 호출 시 lazy하게 정리**한다.

**배경:** attached iframe은 `oko-wallet-app-2` 키로 localStorage에 per-origin 데이터를
persist한다. iOS(ASWebAuthenticationSession)와 Android(Chrome Custom Tab) 모두
브라우저 localStorage가 세션 간 공유될 수 있어, signOut 후에도 이전 유저의 key share가
남아있을 수 있다. 실질적 보안 위험은 낮지만(RN SDK가 signOut 상태에서 RPC 호출을 막음),
불필요한 key share 잔존을 방지하기 위해 정리한다.

**구현:**
- **RPC 페이지 (`/mobile/rpc`):** RN SDK가 RPC URL에 `expected_pk` query param으로
  현재 유저의 publicKey를 포함. `RpcClient`가 iframe init 응답의 `public_key`와 비교하여
  불일치하면 `sign_out` postMessage를 보내 stale session 정리 후 실제 RPC 실행.
- **Login Complete 페이지 (`/mobile/login/complete`):** 새로운 sign-in을 시작하기 전에
  iframe init 응답에 기존 `public_key`가 남아있으면 무조건 `sign_out`으로 정리.
  sign-in은 항상 clean slate에서 시작해야 하므로 `expected_pk` 비교 없이 정리한다.
- `use_attached_init.ts`의 `AttachedInitPayload` 타입이 init 응답의 `data.public_key`를
  포함하여 이 비교를 가능하게 함

### Login Complete (`/mobile/login/complete/_client.tsx`)

- OAuth 콜백으로 받은 토큰을 iframe에 `oauth_info_pass`로 전달
- `oauth_sign_in_update` 메시지로 keygen 완료를 감지
- `fetchWalletInfoFromAttached()` — iframe에 `get_wallet_info` + `get_public_key_ed25519`
  postMessage를 보내 wallet info를 수집 (이전의 same-origin localStorage 읽기를 대체)
- 결과를 login 전용 코덱(`login_url_codec.ts`)으로 인코딩하여 scheme redirect

## 파일 구조

```
src/app/mobile/
├── _shared/
│   ├── build_iframe_src.ts    # iframe src URL 빌드 + ATTACHED_ORIGIN 상수
│   ├── rpc_codec.ts           # RPC 인코딩/디코딩 (tagged types + pako + base64url)
│   ├── send_to_attached.ts    # MessageChannel 기반 postMessage 헬퍼
│   ├── use_attached_init.ts   # iframe init 수신 hook
│   ├── login_url_codec.ts     # sign-in 결과 전용 코덱
│   └── theme_style.tsx        # 테마 스타일
├── rpc/
│   ├── page.tsx               # Generic RPC 서버 컴포넌트 (URL 파싱, iframe src 빌드)
│   └── _client.tsx            # RPC 클라이언트 (iframe 통신 + scheme redirect)
└── login/
    ├── page.tsx               # 로그인 진입 (OAuth URL 생성 or Auth0 리다이렉트)
    ├── _client.tsx            # OAuth/Email 로그인 클라이언트
    └── complete/
        ├── page.tsx           # OAuth 콜백 수신
        └── _client.tsx        # keygen 완료 대기 + wallet info 수집 + redirect
```
