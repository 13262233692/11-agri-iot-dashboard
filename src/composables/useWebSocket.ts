import { ref, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useDashboardStore } from '@/stores/dashboard'

export function useWebSocket(url: string = 'http://localhost:3000') {
  const connected = ref(false)
  const store = useDashboardStore()
  let socket: Socket | null = null

  function connect() {
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    })

    socket.on('connect', () => {
      connected.value = true
      store.wsConnected = true
    })

    socket.on('disconnect', () => {
      connected.value = false
      store.wsConnected = false
    })

    socket.on('sensor:aggregate', (data: any) => {
      store.handleAggregate(data)
    })

    socket.on('sensor:alert', (data: any) => {
      store.handleAlert(data)
    })

    socket.on('sensor:online-stats', (data: any) => {
      store.handleOnlineStats(data)
    })

    socket.on('sensor:latest', (data: any) => {
      store.handleLatest(data)
    })

    socket.on('vpd:update', (data: any) => {
      store.handleVpdUpdate(data)
    })

    socket.on('vpd:latest', (data: any) => {
      store.handleVpdLatest(data)
    })

    socket.on('control:action', (data: any) => {
      store.handleControlAction(data)
    })

    socket.on('control:history', (data: any) => {
      store.handleControlHistory(data)
    })

    socket.on('control:solenoid-states', (data: any) => {
      store.handleSolenoidStates(data)
    })
  }

  function send(event: string, data?: unknown) {
    if (socket?.connected) {
      socket.emit(event, data)
    }
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    connected.value = false
    store.wsConnected = false
  }

  connect()

  onUnmounted(() => {
    disconnect()
  })

  return { connected, send, disconnect }
}
