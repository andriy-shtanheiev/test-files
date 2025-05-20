/// <reference lib="webworker" />

let atomicsBuffer: SharedArrayBuffer;
let atomicsArray: Int32Array;

let port: MessagePort;

async function doLongWork(): Promise<void> {
  debugLog('Doing long work...');
  // Simulate a long-running task
  return new Promise((resolve) => {
    setTimeout(() => {
      debugLog('Long work done, resolving promise');
      resolve();
    }, 3000);
  });
}

async function onMessageChannelMessage(event: MessageEvent) {
  const { data } = event;
  debugLog('Channel message: ' + JSON.stringify(data));
  switch (data.type) {
    case 'longWork':
      await doLongWork();
      debugLog('Long work done, Atomics notify');
      Atomics.store(atomicsArray, 0, 1);
      Atomics.notify(atomicsArray, 0);
      // port.postMessage({
      // 	type: "longWork-done",
      // 	status: "success",
      // });
      break;
    case 'longWork-done':
      // Atomics.store(atomicsArray, 0, 1);
      // Atomics.notify(atomicsArray, 0);
      break;
    default:
      debugLog('Unknown message type');
  }
}

self.onmessage = async (event) => {
  const { data } = event;
  debugLog('Message from main thread: ' + JSON.stringify(data));
  switch (data.type) {
    case 'init':
      debugLog('Initializing worker with port');
      port = data.port;
      port.onmessage = onMessageChannelMessage;
      atomicsBuffer = data.atomicsBuffer;
      atomicsArray = new Int32Array(atomicsBuffer);
      break;
    case 'write':
      {
        const fs = await navigator.storage.getDirectory();
        const fileHandle = await fs.getFileHandle('test.dat', {
          create: true,
        });
        const syncHandle = await fileHandle.createSyncAccessHandle();
        syncHandle.write(new Uint8Array([1, 2, 3, 4, 5]));
        syncHandle.close();
        self.postMessage({ type: 'write-done', status: 'success' });
      }
      break;
    case 'read':
      {
        const fs = await navigator.storage.getDirectory();
        const fileHandle = await fs.getFileHandle('test.dat');
        const syncHandle = await fileHandle.createSyncAccessHandle();
        const buffer = new Uint8Array(5);
        syncHandle.read(buffer);
        syncHandle.close();
        let bufferStr = '';
        for (const i of buffer) {
          bufferStr += i + ' ';
        }
        self.postMessage(
          {
            //buffer: buffer.buffer,
            bufferStr,
            testStr: 'test',
            type: 'read-done',
            status: 'success',
          }
          //[buffer.buffer]
        );
      }
      break;
    case 'atomics':
      {
        const start = Date.now();
        Atomics.store(atomicsArray, 0, 0);
        port.postMessage({
          type: 'longWork',
        });
        const result = Atomics.wait(atomicsArray, 0, 0);
        debugLog('Atomics wait result: ' + result);
        const end = Date.now();
        const duration = end - start;
        debugLog('Posing message in atomics');
        self.postMessage({
          type: 'atomics-done',
          duration,
          status: 'success',
        });
        debugLog(`Atomics duration: ${duration}ms`);
      }
      break;
  }
};

function debugLog(message: string) {
  self.postMessage({ type: 'log', timestamp: Date.now(), message });
}
