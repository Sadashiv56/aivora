export const Spinner = ({ size = 28, color = "var(--wa-green)" }) => (
  <div className="spinner-row">
    <span
      className="spinner"
      style={{ width: size, height: size, borderTopColor: color, borderColor: `${color}33` }}
    />
  </div>
);

export const FullPageLoader = () => (
  <div className="full-page-loader">
    <div className="wa-brand">
      <span className="wa-logo-dot">A</span> Aivora
    </div>
    <Spinner size={40} />
  </div>
);