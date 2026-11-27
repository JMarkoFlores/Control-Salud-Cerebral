import { Request, Response, NextFunction } from 'express';
import { refreshDataMart } from '../services/datamart.service';

export class DataMartController {
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await refreshDataMart();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
