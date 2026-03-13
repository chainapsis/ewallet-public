import type { CSSProperties, FC } from "react";

interface EmailLayoutProps {
  children: React.ReactNode;
}

const rootStyle: CSSProperties = {
  backgroundColor: "#ededed",
  fontFamily: "Inter, Arial, sans-serif",
};
const outerTableStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#ededed",
};
const paddingTdStyle: CSSProperties = { padding: "32px 0 32px 0" };
const centeredTableStyle: CSSProperties = {
  width: "600px",
  maxWidth: "100%",
  margin: "0 auto",
  borderSpacing: "0",
};
const innerTableStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#ededed",
  borderRadius: "28px",
  borderSpacing: "0",
};
const zeroPaddingStyle: CSSProperties = { padding: "0" };
const contentTdStyle: CSSProperties = {
  paddingTop: "8px",
  paddingLeft: "8px",
  paddingRight: "8px",
  paddingBottom: "8px",
};

export const EmailLayout: FC<EmailLayoutProps> = ({ children }) => {
  return (
    <div style={rootStyle}>
      <table
        align="center"
        role="presentation"
        cellPadding="0"
        cellSpacing="0"
        style={outerTableStyle}
      >
        <tbody>
          <tr>
            <td style={paddingTdStyle}>
              <table
                align="center"
                role="presentation"
                cellPadding="0"
                cellSpacing="0"
                style={centeredTableStyle}
              >
                <tbody>
                  <tr>
                    <td style={zeroPaddingStyle}>
                      <table
                        role="presentation"
                        style={innerTableStyle}
                        cellPadding="0"
                        cellSpacing="0"
                      >
                        <tbody>
                          <tr>
                            <td style={contentTdStyle}>{children}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
