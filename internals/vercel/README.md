# Vercel

This is for internal use only.

```sh
vercel link --yes --scope=keplrwallet --project=oko-demo-web
```

### Wasm

If you haven't built wasm before, in the workspace root,

```sh
yarn ci build_cs
yarn ci build_frost
```

#### Preview

```sh
vercel link
vercel build
vercel deploy --prebuilt
```

#### Production

```sh
vercel link
vercel build --prod
vercel deploy --prebuilt --prod
```
