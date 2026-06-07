# F2テニス参加予約アプリ

広告なし、パスワードなし、参加予約が10秒で終わることを目標にしたF2テニス専用の参加予約アプリです。

## 開発

```bash
npm install
npm run dev
```

Supabaseへ接続する場合は `.env.example` を参考に `.env` を作成してください。未設定の場合はデモデータで画面と予約操作を確認できます。

## Supabase

初期DBは [supabase/migrations/202606070001_initial_schema.sql](supabase/migrations/202606070001_initial_schema.sql) を適用します。

フロントエンドには Supabase anon key のみを設定します。Service Role Key は GitHub Pages やフロントエンドに置かないでください。

## 利用申請

メンバーは公開URLのログイン画面から表示名、メールアドレス、所属を入力して利用申請できます。申請直後は `pending` になり、管理者がメンバー画面で承認するまで予定一覧と予約機能は利用できません。

管理者は `/admin/members` で未承認申請を承認または却下できます。個別招待も残しているため、必要な場合は同じメンバー画面から招待できます。

## 招待メール

本番で招待メールを送る場合は、Supabase Edge Function `send-invitation` をデプロイし、フロントエンド環境変数に `VITE_INVITE_EMAIL_ENABLED=true` を設定します。

Edge Function 側には Supabase の `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` が必要です。Service Role Key は Edge Function の環境変数にだけ設定し、フロントエンドには置かないでください。

`VITE_INVITE_EMAIL_ENABLED` が `false` または未設定の場合、管理者画面には「招待メールは送信されません」と表示されます。

## コマンド

```bash
npm run build
npm run preview
```

## GitHub Pages

Project Pagesで公開する場合は、GitHub ActionsのVariablesに `VITE_APP_BASE_PATH=/<repository-name>/` を設定してください。User/Organization Pages直下で公開する場合は `/` のままで構いません。

ビルド時に `dist/404.html` を `index.html` と同内容で生成するため、GitHub Pages上で `/events`、`/events/:eventId`、`/admin` などを直接開いた場合やリロードした場合もSPAが起動します。

Supabase AuthのリダイレクトURLには、公開URLに合わせて `https://<user>.github.io/<repository-name>/events` を許可してください。
