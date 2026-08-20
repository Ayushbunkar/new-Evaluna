
import { router, publicProcedure } from "../init";
export const paymentsRouter = router({
    list: publicProcedure.query(() => [])
});

