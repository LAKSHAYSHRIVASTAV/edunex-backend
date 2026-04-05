const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/conceptMap.controller');

router.post('/generate', ctrl.generate);
router.get('/user/:userId', ctrl.getAll);
router.get('/map/:id', ctrl.getOne);
router.patch('/map/:id/layout', ctrl.updateLayout);
router.delete('/map/:id', ctrl.deleteMap);

module.exports = router;