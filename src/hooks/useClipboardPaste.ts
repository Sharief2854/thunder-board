import { useEffect } from 'react';

interface UseClipboardPasteOptions {
  onPasteImage: (dataUrl: string) => void;
}

export function useClipboardPaste({ onPasteImage }: UseClipboardPasteOptions) {
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      let imageHandled = false;
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              imageHandled = true;
              e.preventDefault();
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onPasteImage(event.target.result as string);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }

      // Fallback for Windows Snipping Tool DIB bitmap data via Electron native clipboard
      if (!imageHandled && window.smartBoardAPI?.readClipboardImage) {
        window.smartBoardAPI.readClipboardImage().then((res: { success: boolean; dataUrl?: string }) => {
          if (res.success && res.dataUrl) {
            onPasteImage(res.dataUrl);
          }
        });
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [onPasteImage]);
}
