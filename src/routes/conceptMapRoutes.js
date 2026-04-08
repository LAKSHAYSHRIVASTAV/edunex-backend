const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/conceptMap.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware, ctrl.generate);
router.get('/user/:userId', authMiddleware, ctrl.getAll);
router.get('/map/:id', authMiddleware, ctrl.getOne);
router.patch('/map/:id/layout', authMiddleware, ctrl.updateLayout);
router.delete('/map/:id', authMiddleware, ctrl.deleteMap);

module.exports = router;
