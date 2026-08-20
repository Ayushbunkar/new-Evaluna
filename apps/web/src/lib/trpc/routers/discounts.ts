
import { router, publicProcedure } from "../init";
export const discountsRouter = router({
    list: publicProcedure.query(() => [])
});

