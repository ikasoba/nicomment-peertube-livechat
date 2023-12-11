import { convert } from "encoding-japanese";
import { client, xml } from "@xmpp/client";
import saslAnonymous from "@xmpp/sasl-anonymous";
import net from "net";
import crypto from "crypto";
import config from "./config.json";

(async () => {
  const startTime = Date.now();
  const serverPort = config.serverPort;

  const nicomment = await net.connect(serverPort);

  const sendText = async (text: string) => {
    const buf = new Uint8Array(
      convert(new TextEncoder().encode(text), "SJIS", "UTF8")
    );

    const len = new Uint8Array(new Int32Array([buf.length]).buffer);

    await nicomment.write(new Uint8Array([...len, ...buf]));
  };

  const url = new URL(config.url);
  const roomId = process.argv[2];
  const nick = process.argv[3] ?? "nicomment-peertube-bot";

  const xmpp = client({
    service: url.toString(),
    domain: "anon." + url.host,
  });

  const receivedId = new Set();

  saslAnonymous(xmpp.sasl);

  xmpp.on("online", () => {
    xmpp.send(
      xml(
        "presence",
        {
          from: xmpp.jid?.toString(),
          id: crypto.randomUUID(),
          to: `${roomId}@room.${url.host}/${nick}`,
        },
        xml("x", { xmlns: "http://jabber.org/protocol/muc" })
      )
    );

    const ping = async () => {
      await xmpp.send(
        xml(
          "iq",
          {
            id: crypto.randomUUID() + ":ping",
            to: `${roomId}@room.${url.host}/${nick}`,
            type: "get",
          },
          xml("ping", { xmlns: "urn:xmpp:ping" })
        )
      );

      setTimeout(ping, 5000);
    };
  });

  xmpp.on("stanza", async (e) => {
    if (e.name == "iq" && e.attrs.id) {
      console.log("-- pingが来た");
    } else if (
      e.name == "message" &&
      e.attrs["from"] &&
      e.attrs.type == "groupchat"
    ) {
      const message = e.getChild("body")?.parent;
      if (message?.attrs.id) {
        const id = "" + message?.attrs.id;
        if (receivedId.has(id)) {
          return;
        }
        receivedId.add(id);
      }

      const text = e.getChild("body")?.getText();
      if (text == null) return;

      // 古いコメントは無視
      const t = new Date(e.getChild("delay")?.attrs.stamp).getTime();
      if (startTime > t) {
        return;
      }

      console.log("メッセージ>", text);
      await sendText(text);
    }
  });

  console.log(await xmpp.start());
})();
