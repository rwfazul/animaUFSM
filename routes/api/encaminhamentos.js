var express = require('express');
var router = express.Router();

var firestore = require('../../services/firestore-api/firestore');

const colEncaminhamentos = 'caed-encaminhamentos';

// GET: /api/encaminhamentos
router
	.get('/', function (req, res) {
		firestore.getAllDocs(colEncaminhamentos, function (docs, err) {
			if (err) res.status(500).send(err);
			else res.status(200).json(docs);
		});
	})
	.get('/pagination/:page', function (req, res) {
		firestore.getDocsPagination(colEncaminhamentos, "timestamp", req.params.page, function (docs, err) {
			if (err) res.status(500).send(err);
			else res.status(200).json(docs);
		});
	});

router.route('/:id')
	.delete(function (req, res) {
		firestore.deleteDoc(colEncaminhamentos, req.params.id, function (docId, err) {
			if (err) res.status(500).send(err);
			else res.status(200).json(docId);
		});
	})
	.put(function (req, res) {
		var doc = {
			agendado: req.body['agendado'],
		};
		firestore.updateDoc(colEncaminhamentos, req.params.id, doc, function (docId, err) {
			if (err) res.status(500).send(err);
			else res.status(200).json(docId);
		});
	})

module.exports = router;