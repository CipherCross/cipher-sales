import { linkedinTools } from "./linkedin.tools";
import { upworkTools } from "./upwork.tools";
import { crossChannelTools } from "./cross-channel.tools";
import { detailTools } from "./detail.tools";
import { sqlTools } from "./sql.tools";

export const tools = {
  ...linkedinTools,
  ...upworkTools,
  ...crossChannelTools,
  ...detailTools,
  ...sqlTools,
};
