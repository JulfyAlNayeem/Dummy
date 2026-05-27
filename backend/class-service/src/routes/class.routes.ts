import { Router } from 'express';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import {
  createClass,
  getClassDetails,
  updateClass,
  deleteClass,
  searchClasses,
  getUserClasses,
  requestJoinClass,
  leaveClass,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  addMember,
  removeMember,
  addModerator,
  removeModerator,
  getClassStats,
  getClassMembers,
  updateClassSettings,
} from '../controllers/class.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', requireTeacher, createClass);
router.get('/search', searchClasses);
router.get('/my', getUserClasses);
router.get('/:classId', getClassDetails);
router.put('/:classId', updateClass);
router.delete('/:classId', deleteClass);
router.get('/:classId/stats', getClassStats);
router.get('/:classId/members', getClassMembers);
router.put('/:classId/settings', updateClassSettings);

router.post('/:classId/join-request', requestJoinClass);
router.get('/:classId/join-requests', getJoinRequests);
router.post('/:classId/join-requests/:requestId/approve', approveJoinRequest);
router.post('/:classId/join-requests/:requestId/reject', rejectJoinRequest);
router.post('/:classId/leave', leaveClass);

router.post('/:classId/members', addMember);
router.delete('/:classId/members/:userId', removeMember);
router.post('/:classId/moderators/:userId', addModerator);
router.delete('/:classId/moderators/:userId', removeModerator);

export default router;
