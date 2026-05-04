import { hocuspocus } from '../../extensions/hocuspocus'

export default defineWebSocketHandler({
  open(peer) {
    const wsLike = {
      send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
        peer.send(data as any)
      },
      close: (code?: number, reason?: string) => peer.close(),
      readyState: 1,
    }

    // Build a Fetch-compatible Request for HocusPocus auth/hooks
    const request = new Request('http://localhost/ws/collab')

    const connection = hocuspocus.handleConnection(wsLike, request)
    ;(peer as any).__hpConn = connection
  },

  message(peer, msg) {
    const data = msg.rawData
    if (data instanceof Uint8Array) {
      ;(peer as any).__hpConn?.handleMessage(data)
    }
  },

  close(peer, details) {
    ;(peer as any).__hpConn?.handleClose({
      code: details?.code ?? 1000,
      reason: details?.reason ?? '',
    })
  },
})
