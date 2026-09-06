import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`CaloriePal AI service listening on http://localhost:${config.port}`);
});
