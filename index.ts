import has from "lodash/has";
import get from "lodash/get";
import pick from "lodash/pick";
import head from "lodash/head";
import isNil from "lodash/isNil";
import every from "lodash/every";
import findKey from "lodash/findKey";
import isEmpty from "lodash/isEmpty";
import isObject from "lodash/isObject";
import isString from "lodash/isString";

enum ETSEndStatuses {
  SUCCESS = "success",
  FAIL = "fail",
  ERROR = "error",
}

type TConfigTemplate = {
  [key in ETSEndStatuses]: { required: string[]; optional?: string[] };
}
type ITSEndObject<T = unknown> = Record<TConfigTemplate[ETSEndStatuses]["required" | "optional"][number], T>

// interface ITSEndObject<T = unknown> {
//   status: ETSEndStatuses;
//   code?: number;
//   data?: T;
//   message?: string;
// }

/**
 * Стандартная конфигурация jsend
 * */
const JSEND_CONFIG: TConfigTemplate = {
  success: { required: ["status", "data"] },
  fail: { required: ["status", "data"] },
  error: { required: ["status", "message"], optional: ["code", "data"] },
};

/**
 * Проверяем наличие обязательных ключей в объекте
 * */
function requireKeys<T extends ITSEndObject>(
  keys: TConfigTemplate[ETSEndStatuses]["required"],
  data: T
): boolean {
  return keys.every((key) => key in data);
}

/** Проверяем соответствие формату JSEnd
 *
 * @param {T} data
 * @param {TConfigTemplate} config
 * @return {boolean} */
function isValid<T extends ITSEndObject>(
  data: T,
  config = JSEND_CONFIG
): boolean {
  return Object.keys(config).some((status) => {
    const spec = config[status];

    return !!spec && requireKeys<T>(spec?.required, data);
  });
}

/** Проверяем валидность конфигурации
 *
 * @param {T extends TConfigTemplate} config
 * @return {boolean} */
function isValidConfig(config: TConfigTemplate): boolean {
  return every(config, (specForStatus: TConfigTemplate[ETSEndStatuses]) => has(specForStatus, 'required'));
}

/**
 * Метод ормирования успешного ответа (success)
 *
 * @param { T extends ITSEndObject } data - объект, из которого формируем ответ
 * @param { TConfigTemplate } config      - объект конфигурации
 * @param { boolean } forceCreate         - флаг для принудительного формирования
 * ответа в конфигурации JSEnd
 * @return { T extends ITSEndObject }
 * */
function success<T extends ITSEndObject = ITSEndObject>(
  data: T,
  config = JSEND_CONFIG,
  forceCreate = false
): T {
  if (!isObject(data)) {
    return error<T>({ message: '' }, config);
  }

  if (forceCreate) {
    const status = ETSEndStatuses.SUCCESS;

    return generateResponse({ status, ...data });
  }

  return generateResponse(data, config);
}

/**
 * Метод ормирования неудачного ответа (fail)
 *
 * @param { T extends ITSEndObject } data - объект, из которого формируем ответ
 * @param { TConfigTemplate } config      - объект конфигурации
 * @param { boolean } forceCreate         - флаг для принудительного формирования
 * ответа в конфигурации JSEnd
 * @return { T extends ITSEndObject }
 * */
function fail<T extends ITSEndObject = ITSEndObject>(
  data: T,
  config = JSEND_CONFIG,
  forceCreate = false
): T {
  if (!isObject(data)) {
    return error<T>({ message: '' }, config);
  }

  if (forceCreate) {
    const status = ETSEndStatuses.FAIL;

    return generateResponse({ status, ...data });
  }

  return generateResponse(data, config);
}

/**
 * Метод ормирования неудачного ответа (fail)
 *
 * @param { T extends ITSEndObject } data - объект, из которого формируем ответ
 * @param { TConfigTemplate } config      - объект конфигурации
 * @param { boolean } forceCreate         - флаг для принудительного формирования
 * ответа в конфигурации JSEnd
 * @return { T extends ITSEndObject }
 * */
function error<T extends ITSEndObject = ITSEndObject>(
  data: T,
  config = JSEND_CONFIG,
  forceCreate = false
): T {
  if (!isObject(data)) {
    return error<T>({ message: '' }, config);
  }

  if (forceCreate) {
    const status = ETSEndStatuses.ERROR;

    return generateResponse({ status, ...data });
  }

  return generateResponse(data, config);
}

/**
 * Метод формирования ответа из переданных данных на основе конфигурации
 *
 * @param { T extends ITSEndObject } data - объект, из которого формируем ответ
 * @param { TConfigTemplate } config      - объект конфигурации
 * @return { T extends ITSEndObject }
 * */
function generateResponse<T extends ITSEndObject = ITSEndObject>(
  data: T,
  config = JSEND_CONFIG
): T {
  if (!isObject(data)) {
    return error<T>({ message: '' }, config);
  }
  // if (isNil(data)) {
  //   return error<T>({ message: '' }, config);
  // }

  /** Под статусом подразумевается одно из свойств объекта конфтгурации.
   * Для конфигурации JSEnd - эти свойства являются статусами. */
  const status = findKey(config, (spec: TConfigTemplate[ETSEndStatuses]) => requireKeys<T>(spec?.required, data))

  if (isNil(status) || isNil(data)) {
    /** Такая реализация пока только для конфигурации JSEnd */
    return error<T>({ message: '' }, config);
  }

  const configByStatus: TConfigTemplate[ETSEndStatuses] = get(config, status, {
    required: [],
    optional: [],
  });
  const { required = [], optional = [] } = configByStatus;

  /** Исключаем из входного объекта все поля, кроме обязательных и опциональных из конфигурации */
  return pick(data, [...required, ...optional]) as T;
}

// function success(data: unknown) {
//   const formattedData: T =
//     data?.status === status ? data : ({ status, data } as T);
//
//   return {
//     data,
//     status: 'success'
//   }
// }

export class TSEnd {
  private readonly _config: TConfigTemplate = JSEND_CONFIG;

  constructor(config?: TConfigTemplate) {
    if (config && !isValidConfig(config)) {
      throw new Error();
    }

    this._config = config ?? this._config;
  }

  /**
   * Статический метод валидации.
   * Проверяем соответствие данных переданному формату или формату TSEnd
   * @param {T} data
   * @param {TConfigTemplate?} config
   * @return {boolean} */
  static isValid = isValid;

  /**
   * Метод валидации.
   * Проверяем соответствие данных формату из _config
   *
   * @param {T} data
   * @return {boolean} */
  public isValid<T extends ITSEndObject>(data: T): boolean {
    return isValid<T>(data, this._config);
  }

  /**
   * Метод генерации ответа в соответствии со статусом, указанным в 'data.status'.
   *
   * @param {T} data
   * @param {TConfigTemplate?} config
   * @return {T | Error} */
  getResponse<T extends ITSEndObject>(
    data: T,
    config?: TConfigTemplate
  ): T | Error {
    return generateResponse<T>(data, config ?? this._config);
  }

  /**
   * Метод генерации ответа со статусом 'success'.
   *
   * @param {T} data
   * @return {ITSEndObject<T>} */
  static success<T>(data: T): ITSEndObject<T> {
    if (isNil(data)) {
      return TSEnd.error('');
    }

    const status = ETSEndStatuses.SUCCESS;

    return ({ status, data });
  }

  /**
   * Метод генерации ответа со статусом 'fail'.
   *
   * @param {T} data
   * @return {ITSEndObject<T>} */
  static fail<T>(data: T): ITSEndObject<T> {
    if (isNil(data)) {
      return TSEnd.error('');
    }

    const status = ETSEndStatuses.FAIL;

    return ({ status, data });
  }

  /**
   * Метод генерации ответа со статусом 'error'.
   *
   * @param {string} message
   * @return {ITSEndObject<T>} */
  static error<T>(message: string): ITSEndObject<T> {
    if (isEmpty(message) && !isString(message)) {
      return TSEnd.error('');
    }

    const status = ETSEndStatuses.ERROR;

    return ({ status, message });
  }
}