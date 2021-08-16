const app = require('express')()
const { CONFIG } = require('./cdk-src/config')

app.get('/how-are-you', (req, res) => res.status(200).json({
    message : 'I am fine, thank you. You?'
}))

app.listen(
    CONFIG.STACK.CONTAINER_PORT, 
    () => console.log(`Server listening to port ${CONFIG.STACK.CONTAINER_PORT}`)
)