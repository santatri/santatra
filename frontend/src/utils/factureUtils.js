export const calculerMontantTotal = (articles) => {
    return articles.reduce((total, article) => total + article.quantite * parseFloat(article.prix), 0);
};