import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private writerWorker1: Worker | null = null;
  private writerWorker2: Worker | null = null;
  ngOnInit(): void {
    this.initWorker();
  }

  private async initWorker() {
    const writerWorker1 = new Worker(
      new URL('./writer.worker', import.meta.url),
      {
        type: 'module',
        name: 'WriterWorker1',
      }
    );

    writerWorker1.onmessage = (event) => {
      const { data } = event;
      switch (data.type) {
        case 'log':
          console.log(`1 Log at ${data.timestamp}: ${data.message}`);
          break;
        default:
          console.log('1 Message from writer worker:', { data });
          break;
      }
    };

    writerWorker1.onerror = (event) => {
      console.error('1 Error from writer worker:', { event });
    };
    this.writerWorker1 = writerWorker1;

    const writerWorker2 = new Worker(
      new URL('./writer.worker', import.meta.url),
      {
        type: 'module',
        name: 'WriterWorker2',
      }
    );

    writerWorker2.onmessage = (event) => {
      const { data } = event;
      switch (data.type) {
        case 'log':
          console.log(`2 Log at ${data.timestamp}: ${data.message}`);
          break;
        default:
          console.log('2 Message from writer worker:', { data });
          break;
      }
    };

    writerWorker2.onerror = (event) => {
      console.error('2 Error from writer worker:', { event });
    };
    this.writerWorker2 = writerWorker2;

    const atomicsBuffer = new SharedArrayBuffer(4);

    const messageChannel = new MessageChannel();

    writerWorker1.postMessage(
      {
        type: 'init',
        port: messageChannel.port1,
        atomicsBuffer,
      },
      [messageChannel.port1]
    );
    writerWorker2.postMessage(
      {
        type: 'init',
        port: messageChannel.port2,
        atomicsBuffer,
      },
      [messageChannel.port2]
    );
  }

  testWrite() {
    this.writerWorker1?.postMessage({
      type: 'write',
    });
  }

  testRead() {
    this.writerWorker1?.postMessage({
      type: 'read',
    });
  }

  testAtomics() {
    this.writerWorker1?.postMessage({
      type: 'atomics',
    });
  }
}
