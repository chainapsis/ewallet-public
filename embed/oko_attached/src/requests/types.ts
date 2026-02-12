export type FetchError =
  | {
      type: "fetch_error";
      err: any;
    }
  | {
      type: "status_fail";
      status: number;
      error: string;
    }
  | {
      type: "json_parse_fail";
      err: any;
    };
