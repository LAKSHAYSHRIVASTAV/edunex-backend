const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/conceptMap.controller');
const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  next();
};

router.post('/generate', optionalAuth, ctrl.generate);
router.get('/user/:userId', optionalAuth, ctrl.getAll);
router.get('/map/:id', optionalAuth, ctrl.getOne);
router.patch('/map/:id/layout', optionalAuth, ctrl.updateLayout);
router.delete('/map/:id', optionalAuth, ctrl.deleteMap);

module.exports = router;
