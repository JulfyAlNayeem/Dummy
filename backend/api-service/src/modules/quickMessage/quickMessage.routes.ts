import { Router } from 'express';
import { isLogin } from '../../middlewares/auth.middleware.js';
import {
  addQuickMessage,
  deleteQuickMessage,
  editQuickMessage,
  getQuickMessages,
} from './quickMessage.controller.js';

const router = Router();

router.get('/', isLogin, getQuickMessages);
router.post('/', isLogin, addQuickMessage);
router.put('/:id', isLogin, editQuickMessage);
router.delete('/:id', isLogin, deleteQuickMessage);

export default router;
