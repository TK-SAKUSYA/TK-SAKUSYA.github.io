# Shared images

このフォルダにサイトで全員に表示したい画像を追加します。

## 追加方法
1. 画像をこの `images` フォルダにアップロードします。
2. `manifest.json` に画像のパスを追加します。順番が表示順になります。

例:
```json
[
  "images/01.jpg",
  "images/02.png"
]
```

対応形式: JPG / JPEG / PNG / GIF / WebP / AVIF

**注意:** ブラウザ上で選んだだけの画像は他の人には共有されません。GitHubリポジトリに画像ファイルとmanifest.jsonを登録すると、全員・全端末で同じ画像と順番が使われます。
