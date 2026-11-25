export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // If visitor is browsing via *.pages.dev, redirect permanently (301) to getblanc.web.id
  if (url.hostname.endsWith(".pages.dev")) {
    url.hostname = "getblanc.web.id";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
};
