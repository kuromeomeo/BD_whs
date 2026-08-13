import {environment} from './environment';

class GoogleScriptRun {
  private proxy!: any;
  private url: string;

  private successCallback: (data: any) => void = () => {};
  private failureCallback: (err: any) => void = (err) => console.error(err);

  constructor() {
    this.url = `https://script.google.com/macros/s/${environment.appsScript.deploymentId}/exec`;
  }

  setProxy(proxy: any) {
    this.proxy = proxy;
  }

  withSuccessHandler(fn: (data: any) => void) {
    this.successCallback = fn;
    return this.proxy || this;
  }

  withFailureHandler(fn: (err: any) => void) {
    this.failureCallback = fn;
    return this.proxy || this;
  }

  invoke(method: string, args: any[]) {
    // Lưu lại handler của request hiện tại để tránh race-condition khi gọi nối tiếp
    const onSuccess = this.successCallback;
    const onFailure = this.failureCallback;

    // Reset handler về mặc định cho lần gọi tiếp theo
    this.successCallback = () => {};
    this.failureCallback = (err) => console.error(err);
    fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
      body: JSON.stringify({
        method: method,
        args : args
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP Status Error: ${res.status}`);
        }
        
        const text = await res.text();
        if (!text) {
          throw new Error('Empty response from Apps Script');
        }
        return JSON.parse(text);
      })
      .then(json => {
        // Kiểm tra logic nghiệp vụ từ Apps Script
        if (!json || json.success === false) {
          // Tạo error object chứa đầy đủ thông tin lỗi từ Backend
          const errorMsg = json?.error || json?.message || `Error status code: ${json?.statusCode || 500}`;
          const err = new Error(errorMsg);
          (err as any).response = json;
          
          onFailure(err);
        } else {
          // Trả về thành công (bạn có thể truyền json hoặc json.data)
          onSuccess(json.data);
        }
      })
      .catch((err) => {
        onFailure(err);
      });

    return this.proxy || this;
  }
}

export function initLocalDevGoogleScriptRun(window: any): void {

    // Only create the shim if Google Apps Script isn't providing one.
    if (window.google?.script?.run) {
      return;
    }
    console.log('Created GoogleScriptRun locally.');
    const runner = new GoogleScriptRun();

    const proxy = new Proxy(runner, {
      get(target, prop) {
        if (typeof prop !== 'string') return undefined;

        if (prop === 'withSuccessHandler')
          return target.withSuccessHandler.bind(target);

        if (prop === 'withFailureHandler')
          return target.withFailureHandler.bind(target);

        return (...args: any[]) => target.invoke(prop, args);
      }
    });

    runner.setProxy(proxy);

    (window as any).google = {
      script: {
        run: proxy
      }
    };
  }
