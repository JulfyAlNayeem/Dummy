import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { pageController } from './page.controller.js';

const router = Router();
router.use(requireAuth);

// My pages & liked pages (specific routes first)
router.get('/my',                         pageController.getMyPages.bind(pageController));
router.get('/liked',                      pageController.getLikedPages.bind(pageController));

// Page CRUD
router.get('/',                           pageController.getPages.bind(pageController));
router.post('/',                          pageController.createPage.bind(pageController));
router.get('/slug/:slug',                 pageController.getPageBySlug.bind(pageController));
router.get('/:pageId',                    pageController.getPage.bind(pageController));
router.put('/:pageId',                    pageController.updatePage.bind(pageController));
router.delete('/:pageId',                 pageController.deletePage.bind(pageController));

// Like / Unlike
router.post('/:pageId/like',              pageController.likePage.bind(pageController));
router.delete('/:pageId/like',            pageController.unlikePage.bind(pageController));

// Page posts
router.post('/:pageId/posts',             pageController.createPagePost.bind(pageController));
router.get('/:pageId/posts',              pageController.getPagePosts.bind(pageController));
router.put('/posts/:postId',              pageController.editPagePost.bind(pageController));
router.delete('/posts/:postId',           pageController.deletePagePost.bind(pageController));

export default router;
