import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
    console.log(
        `API server running on port ${env.port} in ${env.nodeEnv} mode`,
    );
});