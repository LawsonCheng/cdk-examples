const express = require('express');
const app     = express();

app.get('/', (req, res) => res.status(200).end('hi!'))

if(/^dev$/i.test(process.env.MODE) === true) {
    const PORT = process.env.PORT || 1234
    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}

module.exports = app