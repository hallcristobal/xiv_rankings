var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/rankings', (req, res, next) => {
  res.send({server: "Diabolos", name: "Lake Land", loadstone_url: "/lodestone/character/14460190/"})
});

module.exports = router;
