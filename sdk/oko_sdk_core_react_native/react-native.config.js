module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.okowallet.auth.OkoAuthBrowserPackage;',
        packageInstance: 'new OkoAuthBrowserPackage()',
      },
      ios: null,
    },
  },
};
