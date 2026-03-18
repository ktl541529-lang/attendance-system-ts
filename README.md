# 醫院出勤申請管理系統 — Angular + TypeScript 重構版

> 🔁 **系列說明｜三版本技術演進**
>
> | 版本 | Repo | 核心目標 |
> |------|------|----------|
> | v1 | `attendance-system` | 後端架構設計、業務邏輯實作 |
> | v2 | `attendance-system-vue` | 前端元件化工程實踐（Vue 3 + Vite） |
> | v3 ｜**你在這裡** | `attendance-system-ts` | 企業級前端重構（Angular 17+ + TypeScript） |

---

## 📌 Project Overview

這是一套醫院員工出勤申請管理的全端網頁系統，前端以 Angular 17+ 搭配 TypeScript 重構，串接共用的 Node.js / PostgreSQL 後端。
本版本針對 Vue 3 版缺乏型別約束與嚴謹非同步資料流管理的問題進行重構：導入 TypeScript interface 在開發階段捕捉型別錯誤、HttpInterceptor 取代手動 token 管理讓 HTTP 關注點集中、RxJS 以宣告式方式組合多條件篩選的非同步資料流，解決手動協調時序的複雜度。

🌐 **線上 Demo** → [點此開啟系統](https://ktl541529-lang.github.io/attendance-system-ts/)

| 層級 | 服務 |
|------|------|
| 前端 | Vercel（Angular 17+） |
| 後端 | Render（Node.js）— 與 v1 共用 |
| 資料庫 | Supabase（PostgreSQL）— 與 v1 共用 |

**示範帳號**

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | 1234 | 管理者 |
| emp1  | 1234 | 一般員工 |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────┐
│              Angular 17+ (GitHub Pages)              │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Router       │  │  Services    │  │  Models   │  │
│  │ + AuthGuard  │  │  auth.service│  │  interface│  │
│  │ + LazyLoad   │  │  attendance  │  │  union    │  │
│  └──────┬───────┘  │  holiday     │  │  type     │  │
│         │          └──────┬───────┘  └───────────┘  │
│  ┌──────▼──────────────────▼───────────────────────┐ │
│  │          HttpInterceptor (auth.interceptor)      │ │
│  │   Auto-inject token · Centralize 401 handling   │ │
│  └──────────────────────┬──────────────────────────┘ │
└─────────────────────────┼───────────────────────────┘
                          │ REST API (HTTPS)
┌─────────────────────────▼───────────────────────────┐
│          Node.js + Express Backend (Render)          │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              Supabase PostgreSQL                     │
└──────────────────────────────────────────────────────┘
```

**RxJS 篩選資料流：**

```
statusFilter.valueChanges ──┐
typeFilter.valueChanges ────┼─ combineLatest → switchMap → HTTP Request → UI 更新
keywordFilter.valueChanges ─┘  (debounceTime 300ms)        (takeUntil destroy$)
```

---

## ✨ Features

**員工功能**
- 登入 / 登出（JWT，頁面重整後自動還原登入狀態）
- 個人申請列表（含多條件篩選）
- 新增 / 編輯 / 刪除出勤申請
- 申請表單假日警示（串接政府開放資料 API）
- 查看審核結果與退回原因

**管理者功能**
- 角色分離儀表板（全員統計、假別分佈、近 6 個月申請趨勢）
- 審核管理（核准 / 退回）
- 全部申請紀錄查詢（RxJS 多條件即時篩選）
- 員工帳號管理
- 操作稽核紀錄查詢

**系統特性**
- TypeScript 型別安全——compile time 即捕捉型別錯誤
- HttpInterceptor——所有 HTTP 請求統一注入 token
- RxJS 響應式資料流——篩選條件變更即時觸發 API，自動取消過時請求
- Lazy Loading——各頁面按需載入，初始包體積最小化
- 假日快取——同一 session 內不重複請求相同年份假日資料

---

## 🎯 重構動機：從 Vue 到 Angular，解決什麼問題？

| 問題 | Vue 3 版本的狀況 | Angular 重構的解法 |
|------|----------------|-------------------|
| 型別安全 | JavaScript，runtime 才發現型別錯誤 | TypeScript interface + union type，IDE 開發階段即提示 |
| HTTP 管理 | Fetch 模組手動帶 token | HttpInterceptor 自動注入，401 處理集中 |
| 複雜資料流 | 多條件篩選需手動協調時序 | RxJS combineLatest + switchMap，資料流宣告式組合 |
| 路由保護 | `beforeEach` 命令式判斷 | `CanActivateFn` 宣告式守衛，Lazy Loading 按需載入 |
| 假日感知 | 無 | 串接政府開放資料 API，表單即時提示 |

---

## 🔑 Technical Highlights

### 1. HttpInterceptor — 統一 Token 管理

```typescript
// core/interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401) inject(AuthService).logout();
      return throwError(() => err);
    })
  );
};
```

### 2. TypeScript 型別設計

```typescript
// models/attendance.model.ts
export type AttendanceStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceType = '特休' | '病假' | '事假' | '婚假' | '喪假' | '加班補休';

export interface AttendanceRequest {
  id: number;
  user_id: number;
  type: AttendanceType;
  status: AttendanceStatus;
  start_date: string;
  end_date: string;
  reason: string;
  reject_reason?: string;
}
```

### 3. RxJS 響應式篩選資料流

```typescript
this.filteredRequests$ = combineLatest([
  this.statusFilter.valueChanges.pipe(startWith('')),
  this.typeFilter.valueChanges.pipe(startWith('')),
  this.keywordFilter.valueChanges.pipe(startWith(''), debounceTime(300)),
]).pipe(
  switchMap(([status, type, keyword]) =>
    this.attendanceService.getRequests({ status, type, keyword })
  ),
  takeUntil(this.destroy$)
);
```

- `combineLatest`：任一篩選條件改變即觸發
- `debounceTime(300)`：關鍵字輸入防抖，避免每次按鍵都發請求
- `switchMap`：只保留最後一次請求結果，自動取消過時請求
- `takeUntil`：元件銷毀時自動清理訂閱，防止 memory leak

### 4. AuthGuard + Lazy Loading

```typescript
// core/guards/auth.guard.ts
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  if (route.data['adminOnly'] && !auth.isAdmin()) return router.createUrlTree(['/dashboard']);
  return true;
};
```

### 5. 角色分離儀表板

儀表板依登入角色動態切換資料來源與顯示內容——管理者看全員統計，員工只看個人統計。角色判斷在 Service 層與 template 同時進行，非單純 `*ngIf` 隱藏 DOM，確保管理者專屬 API 不會被員工觸發。

### 6. 政府假日 API 串接

串接政府開放資料假日 API，申請表單日期選到假日或週末時即時顯示警告。HolidayService 實作本地快取，同一 session 內不重複請求相同年份資料。

---

## 🔄 三版本完整對比

| 面向 | v1 原版（Vue CDN） | v2 Vue 3 Vite | v3 Angular（本版） |
|------|------------------|--------------|-------------------|
| 架構 | 單一 HTML | SFC 元件化 | Angular CLI 模組化 |
| 型別系統 | 無 | JavaScript | TypeScript + interface |
| HTTP 管理 | 手動帶 token | 統一 Fetch 模組 | HttpInterceptor |
| 資料流 | 無 | 無 | RxJS 響應式組合 |
| 路由保護 | 無 | beforeEach 守衛 | CanActivateFn + Lazy Loading |
| 儀表板 | 無 | 基本統計 | 角色分離完整儀表板 |
| 第三方 API | 無 | 無 | 政府假日 API |

---

## 🛠 Tech Stack

| 層級 | 技術 |
|------|------|
| 前端框架 | Angular 17+、TypeScript |
| 樣式 | SCSS |
| 狀態 / 資料流 | RxJS（combineLatest、switchMap、debounceTime、takeUntil） |
| HTTP 處理 | Angular HttpClient + HttpInterceptor |
| 路由保護 | AuthGuard（CanActivateFn）+ Lazy Loading |
| 第三方 API | 政府開放資料假日 API |
| 部署 | GitHub Pages |

---

## 📁 Project Structure

```
src/app/
├── core/
│   ├── interceptors/
│   │   └── auth.interceptor.ts     # 統一 Token 注入 + 401 攔截
│   ├── services/
│   │   ├── auth.service.ts         # 登入狀態管理
│   │   ├── attendance.service.ts   # 出勤申請 CRUD
│   │   └── holiday.service.ts      # 假日 API + 本地快取
│   └── guards/
│       └── auth.guard.ts           # CanActivateFn 路由保護
├── models/
│   ├── user.model.ts
│   ├── attendance.model.ts         # AttendanceStatus / AttendanceType union type
│   └── audit-log.model.ts
├── pages/
│   ├── login/
│   ├── dashboard/                  # 角色分離儀表板
│   └── attendance/                 # 出勤管理（含 RxJS 篩選流程）
└── environments/
    ├── environment.ts              # dev 環境設定
    └── environment.prod.ts         # prod 環境設定
```

---

## ⚙️ Local Development

```bash
npm install
ng serve
```

後端 API：[attendance-system](https://github.com/ktl541529-lang/attendance-system)（部署於 Render）

API Base URL 設定於 `src/environments/environment.ts`：

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://attendance-system-p71q.onrender.com/api'
};
```

---

## 🔮 Future Improvements

- [ ] 部署遷移至 Vercel——取代 GitHub Pages，與 v2 Vue 版保持一致的部署平台
- [ ] 多租戶架構——organization_id 隔離不同機構資料，支援 SaaS 商業模式
- [ ] Stripe 訂閱金流——Angular 版整合 Stripe Elements，型別安全的金流串接
- [ ] Signal 架構升級——Angular 17+ 的 Signal API 取代部分 RxJS Subject，簡化狀態管理
- [ ] NgRx Store——隨功能複雜度提升，導入 NgRx 做全域狀態管理
- [ ] E2E 測試——使用 Cypress 或 Playwright 補充關鍵流程的端對端測試
- [ ] Server-Side Rendering（SSR）——Angular Universal 提升 SEO 與首屏載入速度

---

> 📌 **系列起點**：前往 [`attendance-system`](https://attendance-system-ts.vercel.app) 了解後端架構設計與業務邏輯決策。
