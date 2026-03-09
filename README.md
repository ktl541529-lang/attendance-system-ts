# 🏥 醫院出勤申請管理系統 v2 (Angular + TypeScript)

> 本專案為 [attendance-system](https://github.com/ktl541529-lang/attendance-system) 的 TypeScript + Angular 重構版本  
> 前後端分離架構，前端框架從 Vue 3 重構為 Angular 17+，後端 API 不變

---

## 🌐 線上 Demo

👉 [點此開啟系統（建置中）]()

| 層級 | 服務 |
|---|---|
| 前端 | GitHub Pages（Angular） |
| 後端 | Render（Node.js）— 與原版共用 |
| 資料庫 | Railway（MySQL）— 與原版共用 |

### 示範帳號

| 帳號 | 密碼 | 角色 |
|---|---|---|
| admin | 1234 | 管理者 |
| emp1 | 1234 | 一般員工 |

---

## 🛠 技術棧

| 層級 | 技術 |
|---|---|
| 前端框架 | Angular 17+、TypeScript |
| 樣式 | SCSS |
| 狀態管理 | RxJS（combineLatest、switchMap、debounceTime、takeUntil） |
| HTTP 處理 | Angular HttpClient、HttpInterceptor |
| 路由保護 | AuthGuard（CanActivateFn） |
| 第三方 API | 政府開放資料假日 API |
| 版本控管 | Git / GitHub |

---

## 🔑 技術亮點

### 1. HttpInterceptor — 統一 Token 管理
所有 HTTP Request 自動附加 `Authorization: Bearer <token>`，無需每個 API call 手動處理。同時攔截 401 回應，自動清除 token 並導回登入頁，對應後端的 `auth.js` middleware 形成前後端對稱的安全防護。

### 2. TypeScript 型別設計
使用 `interface` 定義所有資料模型，用 `union type` 限制狀態與假別欄位的合法值，讓 IDE 能在開發階段即時提示錯誤，避免 runtime 的型別問題。
```typescript
export type AttendanceStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceType = '特休' | '病假' | '事假' | '婚假' | '喪假';
```

### 3. RxJS 篩選流程
出勤列表的篩選條件（狀態、假別、關鍵字）使用 `combineLatest` 合併多個 FormControl stream，`debounceTime(300)` 避免每次輸入都觸發 API，`switchMap` 確保只保留最後一次請求結果，`takeUntil` 在元件銷毀時自動取消訂閱防止 memory leak。

### 4. 第三方 API 串接 — 假日警告
串接政府開放資料假日 API，在申請表單的日期欄位選到假日或週末時即時顯示警告提示，並在 Service 層快取已載入的假日資料避免重複請求。

### 5. AuthGuard 路由保護
使用 `CanActivateFn` 保護需要登入才能進入的路由，未登入時自動導回登入頁，搭配 Lazy Loading 實現按需載入各頁面元件。

---

## 📁 專案結構
```
src/app/
├── core/
│   ├── interceptors/     # AuthInterceptor — 統一 HTTP 處理
│   ├── services/         # AuthService、AttendanceService、HolidayService
│   └── guards/           # AuthGuard — 路由保護
├── models/               # TypeScript interface 定義
│   ├── user.model.ts
│   ├── attendance.model.ts
│   └── audit-log.model.ts
├── pages/
│   ├── login/            # 登入頁
│   ├── dashboard/        # 首頁
│   └── attendance/       # 出勤申請管理（含 RxJS 篩選）
└── environments/         # dev / prod 環境設定
```

---

## 🔄 與原版的差異

| 面向 | 原版（Vue 3） | 本版（Angular） |
|---|---|---|
| 前端框架 | Vue 3 CDN，單一 HTML | Angular CLI，元件化架構 |
| 型別系統 | JavaScript | TypeScript，完整 interface 定義 |
| HTTP 管理 | 手動帶 token | HttpInterceptor 統一處理 |
| 篩選邏輯 | 無 | RxJS combineLatest + switchMap |
| 路由保護 | 無 | AuthGuard CanActivateFn |
| 第三方 API | 無 | 政府假日 API 串接 |