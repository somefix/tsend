import has from "lodash/has";
import get from "lodash/get";
import pick from "lodash/pick";
import head from "lodash/head";
import isNil from "lodash/isNil";
import every from "lodash/every";

interface IConfigTemplate {
  [K: string]: { required: string[]; optional?: string[] };
}
type TJSendStatuses = "success" | "fail" | "error";
type ITSendObject = Record<IConfigTemplate[string]["required" | "optional"][number], unknown>

interface IJSendObject {
  status: TJSendStatuses | string;
  code?: number;
  data?: unknown;
  message?: string;
}

/** Стандартная конфигурация jsend */
const JSEND_CONFIG: IConfigTemplate = {
  success: { required: ["status", "data"] },
  fail: { required: ["status", "data"] },
  error: { required: ["status", "message"], optional: ["code", "data"] },
};

// /** Стандартная конфигурация UW 3.0 */
// const UW_CONFIG: IConfigTemplate = {
//   success: { required: ["status", "data"] },
//   fail: { required: ["status", "error"] },
//   empty: { required: ["status"] },
// };

/** Проверяем наличие обязательных ключей в объекте */
function requireKeys<T extends ITSendObject>(
  keys: IConfigTemplate[string]["required"],
  data: T
): boolean {
  return keys.every((key) => key in data);
}

/** Проверяем соответствие формата объекту config
 *
 * @param {T} data
 * @param {IConfigTemplate} config
 * @return {boolean} */
function isValid<T extends ITSendObject>(
  data: T,
  config = JSEND_CONFIG
): boolean {
  return Object.keys(config).some((status) => {
    const spec = config[status];

    return !!spec && requireKeys<T>(spec?.required, data);
  });
}

/** Проверяем соответствие формата кастомной конфигурации
 *
 * @param {T extends IConfigTemplate} config
 * @return {boolean} */
function isValidConfig(config: IConfigTemplate): boolean {
  return every(config, (specForStatus: IConfigTemplate[number]) => has(specForStatus, 'required'));
}

function generateResponse<T extends ITSendObject>(
  data: T,
  config = JSEND_CONFIG
): T | Error {
  if (isNil(data) || isNil(data.status)) {
    return new Error("'data' and 'data.status' must be defined!");
  }

  const { status } = data;
  const isConfigValid = isValid(data, config);
  const isJSEndValid = isValid(data);
  const configByStatus: IConfigTemplate[string] = get(config, status, {
    required: [],
    optional: [],
  });
  const jsEndConfigByStatus: IConfigTemplate[string] = get(
    JSEND_CONFIG,
    status,
    { required: [], optional: [] }
  );
  const required = configByStatus?.required ?? [];
  const optional = configByStatus?.optional ?? [];
  const requiredJSEnd = jsEndConfigByStatus?.required ?? [];
  const optionalJSEnd = jsEndConfigByStatus?.optional ?? [];
  let resultObject: T = {} as T;

  if (isConfigValid) {
    resultObject = pick(data, [...required, ...optional]) as T;
  } else {
    if (isJSEndValid) {
      const dataFieldJSEnd: string = head(
        requiredJSEnd.filter((key) => key !== "status")
      ) as string;
      const dataField: string =
        head(required.filter((key) => key !== "status")) ?? dataFieldJSEnd;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      resultObject = { [dataField]: data[dataFieldJSEnd], status } as T;
    } else {
      resultObject = {
        ...pick(data, [...requiredJSEnd, ...optionalJSEnd]),
        status,
      } as T;
    }
  }

  return resultObject;
}

export class TSEnd {
  private readonly _config: IConfigTemplate = JSEND_CONFIG;

  constructor(config?: IConfigTemplate) {
    if (config && !isValidConfig(config)) {
      throw new Error();
    }
    this._config = config ?? this._config;
  }

  /**
   * Статический метод валидации.
   * Проверяем соответствие данных переданному формату или формату JSEnd
   * @param {T} data
   * @param {IConfigTemplate?} config
   * @return {boolean} */
  static isValid = isValid;

  /**
   * Метод валидации.
   * Проверяем соответствие данных формату из _config
   *
   * @param {T} data
   * @return {boolean} */
  public isValid<T extends ITSendObject>(data: T): boolean {
    return isValid<T>(data, this._config);
  }

  /**
   * Метод генерации ответа в соответствии со статусом, указанным в 'data.status'.
   *
   * @param {T} data
   * @param {IConfigTemplate?} config
   * @return {T | Error} */
  getResponse<T extends ITSendObject>(
    data: T,
    config?: IConfigTemplate
  ): T | Error {
    return generateResponse<T>(data, config ?? this._config);
  }

  /**
   * Метод генерации ответа со статусом 'success'.
   *
   * @param {T} data
   * @param {IConfigTemplate?} config
   * @return {T | Error} */
  static success<T extends ITSendObject>(
    data: T,
    config?: IConfigTemplate = JSEND_CONFIG
  ): T | Error {
    const status = "success";
    const formattedData: T =
      data?.status === status ? data : ({ status, data } as T);

    return generateResponse<T>(formattedData, config ?? this._config);
  }

  /** Метод генерации ответа со статусом 'fail'.
   *
   * @param {T} data
   * @param {IConfigTemplate?} config
   * @return {T | Error} */
  fail<T extends ITSendObject>(data: T, config?: IConfigTemplate): T | Error {
    const status = "fail";
    const formattedData: T =
      data?.status === status ? data : ({ status, data } as T);

    return generateResponse<T>(formattedData, config ?? this._config);
  }

  /** Метод генерации ответа со статусом 'error'.
   *
   * @param {T} data
   * @param {IConfigTemplate?} config
   * @return {T | Error} */
  error<T extends ITSendObject>(data: T, config?: IConfigTemplate): T | Error {
    const status = "error";
    const formattedData: T =
      data?.status === status ? data : ({ status, data } as T);

    return generateResponse<T>(formattedData, config ?? this._config);
  }
}

export type ITSEnd = TInterface<TSEnd>;
