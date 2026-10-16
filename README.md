This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin／一般使用者帳號

`/admin` 是共同登入入口，可以切換 Admin／一般使用者；一般使用者可使用帳號、密碼註冊，成功後會自動登入。使用者帳號為 3–32 個英數字、底線、點或連字號，去除前後空白並轉為小寫；新註冊密碼為 4–16 字元，空白及大小寫均保留；既有帳號仍可使用原密碼登入。既有帳號（包含設定的 Admin 名稱）不可重複註冊。

兩種帳號沿用 `/admin/dashboard` 管理自己的測驗、題庫及名單。共用題庫依身分隔離：Admin 只能看到並使用其他 Admin 共用的題庫，一般使用者只能看到並使用其他一般使用者共用的題庫；私人題庫、修改及刪除仍只允許擁有者。Admin 帳密繼續由 `ADMIN_USERS` 設定；一般帳號存於資料庫，密碼以加鹽 scrypt 雜湊保存。Google 考生登入與既有測驗入口不受影響。

### 資料庫更新

部署新版程式前，先確認 `DATABASE_URL` 與 `DATABASE_URL_UNPOOLED` 指向預期的資料庫，再套用 migration：

```bash
npx prisma migrate deploy
npx prisma generate
```

Prisma CLI 預設讀取 `.env`，請確保部署環境變數與應用程式一致（Next.js 亦會載入 `.env.local`）。本次 migration 新增 `User` 及資源 `ownerKey`，以 `admin:<原帳號>` 回填既有資料，保留既有測驗及題庫；請勿使用 `migrate reset`。正式環境必須設定安全的 `JWT_SECRET`，缺少時不會簽發管理 session。

### 驗證

```bash
npm test
npx tsc --noEmit --incremental false
npm run build
```

測試使用既有 TypeScript 編譯器及 Node 內建 test runner，不需要額外安裝套件；涵蓋密碼、帳號重複、token 與管理權限。測試中的資料庫及 Next 邊界為 mock，不會連線或修改設定的資料庫。完整資料庫及介面驗收須在獲准的測試環境另外進行。登入／註冊目前未加入分散式請求限流；對公開服務應在部署入口設定限流。原有 `seed` 指令需要環境另有 `tsx`。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
