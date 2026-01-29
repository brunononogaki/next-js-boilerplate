# Next.JS Boilerplate

Esse é um template de projeto funcional usando Next.JS. O código está sendo construindo seguindo o material do [`curso.dev`](https://curso.dev) do Filipe Deschamps, e todo o progresso está sendo documentado aqui: [Documentação do Projeto](https://mkdocs.brunononogaki.com). A ideia final nesse projeto é criar um clone da página [TabNews](https://www.tabnews.com.br/), mas a maioria dos conceitos podem se aplicados para muitos projetos web.

## Instalar e rodar o projeto

Rodar o projeto em sua máquina local é uma tarefa extremamente simples.

### Dependências globais

Você precisa ter duas principais dependências instaladas:

- Node.js LTS v22 (ou qualquer versão superior)
- Docker Engine v17.12.0 com Docker Compose v1.29.2 (ou qualquer versão superior)

### Dependências locais

Com o repositório clonado e as dependências globais instaladas, você pode instalar as dependências locais do projeto:

```bash
npm install
```

### Rodar o projeto

Para rodar o projeto localmente, basta executar o comando abaixo:

```bash
npm run dev
```

Isto irá automaticamente rodar serviços como Banco de dados (incluindo as Migrations), Servidor de Email e irá expor um Serviço Web (Frontend e API) no seguinte endereço:

```bash
http://localhost:3000/
http://localhost:3000/api/v1/status
```

## Rodar os testes

Há várias formas de rodar os testes dependendo do que você deseja fazer, mas o primeiro passo antes de fazer qualquer alteração no projeto é rodar os testes de forma geral para se certificar que tudo está passando como esperado. O comando abaixo irá rodar todos os serviços necessários, rodar os testes e em seguida derrubar todos os serviços.

```bash
npm test
```

Caso queira manter os serviços e testes rodando enquanto desenvolve (e rodando novamente a cada alteração salva), use o modo `watch` com o comando abaixo:

```bash
npm run test:watch:services
```
