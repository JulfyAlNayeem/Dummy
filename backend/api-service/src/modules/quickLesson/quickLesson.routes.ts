import { Router } from 'express';
import { isLogin } from '../../middlewares/auth.middleware.js';
import {
  getQuickLessons,
  addQuickLesson,
  editQuickLesson,
  deleteQuickLesson,
} from './quickLesson.controller.js';

const router = Router();

router.get('/', isLogin, getQuickLessons);
router.post('/', isLogin, addQuickLesson);
router.put('/:id', isLogin, editQuickLesson);
router.delete('/:id', isLogin, deleteQuickLesson);

export default router;
