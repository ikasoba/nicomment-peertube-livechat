# nicomment-peertube-livechat

peertubeのlivechatをnicommentへ流すやつ

# 設定

main.tsと同じ階層のconfig.jsonに設定を書いてください。

- url

  これはpeertubeのlivechatプラグインのxmpp-websocketのエンドポイントを指定してください。

- serverPort

  これは動かしているnicommentのポート番号を書いてください。

# 使い方

```
npm run start <部屋のID>
```
とすれば起動できます。