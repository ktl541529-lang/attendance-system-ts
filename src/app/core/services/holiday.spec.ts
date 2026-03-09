import { TestBed } from '@angular/core/testing';

import { Holiday } from './holiday';

describe('Holiday', () => {
  let service: Holiday;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Holiday);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
