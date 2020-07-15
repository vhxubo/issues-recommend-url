const fetch = require('node-fetch');
const fs = require('fs');
// const HttpProxyAgent = require('http-proxy-agent');
require('dotenv').config();

// vhxubo/test [0]=vhxubo [1]=test
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY.split('/');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 展示数量
const SHOW_NUM = process.env.SHOW_NUM;

const query = `query {
    viewer {
      repository(name: "${GITHUB_REPOSITORY[1]}") {
        issues(last: ${SHOW_NUM}, orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes {
            title
            body
            createdAt
            author {
              login
            }
            labels(first: 1) {
              nodes {
                name
                url
              }
            }
            up: reactions(first: 1, content: THUMBS_UP) {
              totalCount
            }
          }
        }
      }
    }
  }`;

const model = function ({ title, url, description, labels, up }) {
  return `<table><tr>
<td>
<a href="${url}">${title} 👍${up}</a>
</td>
<td align="right">
<a href="${labels[0].url}">标签：${labels[0].name}</a>
</td>
</tr><tr>
<td colspan="2">
${description}
</td>
</tr></table>
`;
};

function Node(info, description, labels, up) {
  this.title = info[1];
  this.url = info[2];
  this.description = description;
  this.labels = labels;
  this.up = up;
}

/**
 * 写到文件
 *
 * @param {*} text
 */
const output = function (text) {
  fs.writeFile('README.md', text, (err) => console.log(err));
};

/**
 * 将 nodes 转换为 html
 *
 * @param {*} { result: nodes, totalCount }
 */
const parse = function ({ result: nodes, totalCount }) {
  console.log('nodes', JSON.stringify(nodes, null, 2));
  const parseHtml = nodes.map((node) => model(node));
  const outText = parseHtml.join('\n') + `\n共收录 ${totalCount} 篇\n`;
  console.log(outText);
  output(outText);
};

/**
 * 将数据转换为 Node 类型的数组
 *
 * @param {*} resp
 * @returns
 */
const init = function ({ data }) {
  let result = [];
  const nodes = data.viewer.repository.issues.nodes;
  const totalCount = data.viewer.repository.issues.totalCount;

  for (const node of nodes) {
    if (node.author.login !== GITHUB_REPOSITORY[0]) {
      return;
    }

    result.push(
      new Node(
        /\[(.*?)\]\((.*?)\)/.exec(node.title),
        node.body,
        node.labels.nodes,
        node.up.totalCount
      )
    );
  }

  return { result, totalCount };
};

fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    // agent: new HttpProxyAgent('http://127.0.0.1:1081'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `bearer ${GITHUB_TOKEN}`,
  },
  body: JSON.stringify({ query }),
})
  .then((res) => res.json())
  .then((resp) => parse(init(resp)))
  .catch((err) => console.log('fuck ', err));
