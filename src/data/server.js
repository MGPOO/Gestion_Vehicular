import express from 'express';
import cors from 'cors';

const app = express();
const port = 8008;

app.use(cors());
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});
