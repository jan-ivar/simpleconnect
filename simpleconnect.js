function RTCSimpleConnection(config, socket) {
  let sc = socket, dc, cc, pc = new RTCPeerConnection(config);
  let fail = e => pc.onerror && pc.onerror(e);
  let once = name => new Promise(r => pc.addEventListener(name, r));
  let set = sdp => pc.setLocalDescription(sdp).then(() => sc.send(JSON.stringify({sdp})));
  let incoming = msg => msg.sdp && pc.setRemoteDescription(msg.sdp)
    .then(() => pc.signalingState == "stable" || pc.createAnswer().then(set))
    .catch(fail) || msg.ice && pc.addIceCandidate(msg.ice).catch(fail);

  sc.onmessage = e => incoming(JSON.parse(e.data));
  let init = () => {
    dc.onopen = e => {
      (sc = dc).onmessage = e => incoming(JSON.parse(e.data));
      pc.addEventListener("negotiationneeded", e => pc.createOffer().then(set).catch(fail));
    };
    cc.onopen = e => (cc.onmessage = e => pc.onmessage && pc.onmessage(e)) && pc.onopen && pc.onopen(e);
  };
  let co = pc.createOffer.bind(pc);
  pc.createOffer = o => (dc || !init([dc, cc] = ["signaling", "chat"].map(n => pc.createDataChannel(n)))) && co(o);
  once("datachannel").then(e => (dc = e.channel) && once("datachannel").then(e => cc = e.channel)).then(init);
  pc.addEventListener("icecandidate", e => sc.send(JSON.stringify({ice: e.candidate})));
  pc.connect = () => pc.createOffer().then(set).catch(fail);
  pc.send = msg => cc && cc.send(msg);
  return pc;
}
