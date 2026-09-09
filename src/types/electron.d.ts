import { SmartBoardAPI } from '../../electron/preload';

declare global {
  interface Window {
    smartBoardAPI?: SmartBoardAPI;
    chalkByteAPI?: SmartBoardAPI;
    thunderBoardAPI?: SmartBoardAPI;
  }
}

export {};
