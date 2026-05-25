import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { searchController } from './search.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',                         searchController.globalSearch.bind(searchController));
router.get('/users',                    searchController.searchUsers.bind(searchController));
router.get('/posts',                    searchController.searchPosts.bind(searchController));
router.get('/pages',                    searchController.searchPages.bind(searchController));
router.get('/hashtags',                 searchController.searchHashtags.bind(searchController));
router.get('/hashtags/:tag/posts',      searchController.getPostsByHashtag.bind(searchController));

export default router;
