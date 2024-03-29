// import { describe, expect, test } from '@jest/globals';

import { JSEND_CONFIG, TSEnd } from "../index";

describe('tsend', () => {
  describe('Стандартная конфигурация JSEnd', () => {
    const tsendInstance = new TSEnd();
    const successValidData = { status: 'success', data: [1, 2, 3] };

    describe('success', () => {
      it('Валидный формат', () => {
        const response = TSEnd.success(successValidData);
        const instanceResponse = tsendInstance.success(successValidData);

        expect().toBe();
      });
    });
  });
});