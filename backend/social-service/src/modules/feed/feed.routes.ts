import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { feedController } from './feed.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',           feedController.getHomeFeed.bind(feedController));
router.get('/discover',   feedController.getDiscoverFeed.bind(feedController));
router.get('/stories',    feedController.getStoriesFeed.bind(feedController));

export default router;
