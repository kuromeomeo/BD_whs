declare const google: any;

const isGasEnvironment =
  typeof google !== 'undefined' &&
  google.script &&
  google.script.run;

export class StorageHelper {

  static syncData(sheetName: string, data: any[]) {

    localStorage.setItem(
      `chem_${sheetName.toLowerCase()}`,
      JSON.stringify(data)
    );

    if (isGasEnvironment) {
      google.script.run.saveTable(
        sheetName,
        JSON.stringify(data)
      );
    }
  }

  static syncConfig(config: {
    appName: string;
    warningThresholdDays: number;
    criticalThresholdDays: number;
    qcControlledWarehouseIds: string[];
  }) {

    const payload = [{
      ...config,
      qcControlledWarehouseIds: JSON.stringify(
        config.qcControlledWarehouseIds
      )
    }];

    localStorage.setItem(
      'chem_config',
      JSON.stringify(payload)
    );

    if (isGasEnvironment) {
      google.script.run.saveTable(
        'Config',
        JSON.stringify(payload)
      );
    }
  }

  static readLocal<T>(key: string): T | null {

    const value = localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : null;
  }

  static saveLocal(key: string, value: unknown) {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  }

  static removeLocal(key: string) {

    localStorage.removeItem(key);
  }

  static clearChemStorage() {

    for (let i = localStorage.length - 1; i >= 0; i--) {

      const key = localStorage.key(i);

      if (key?.startsWith('chem_')) {
        localStorage.removeItem(key);
      }
    }
  }
}