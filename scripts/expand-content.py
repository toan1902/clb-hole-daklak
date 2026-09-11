"""Inventory the existing homepage without rewriting its public markup."""
from html.parser import HTMLParser
from pathlib import Path
import json

root=Path(__file__).resolve().parent.parent
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.tree={'tag':'','attrs':{},'children':[],'parts':[],'selector':''};self.stack=[self.tree]
    def handle_starttag(self,tag,attrs):
        parent=self.stack[-1]; attrs=dict(attrs)
        n=sum(c['tag']==tag for c in parent['children'])+1
        node={'tag':tag,'attrs':attrs,'children':[],'parts':[],'selector':(parent['selector']+' > ' if parent['selector'] else '')+tag+':nth-of-type('+str(n)+')','parent':parent}
        parent['children'].append(node)
        if tag=='br':
            for p in self.stack:p['parts'].append('\n')
        if tag not in ['meta','link','img','input','br','hr','source','wbr']:self.stack.append(node)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
    def handle_data(self,data):
        for p in self.stack:p['parts'].append(data)
p=Parser();p.feed((root/'index.html').read_text(encoding='utf-8'))
fields=json.loads((root/'assets/content-fields.json').read_text(encoding='utf-8'))
fields=[f for f in fields if not f['id'].startswith('page-')]
groups={'hero':'Đầu trang','gioithieu':'Giới thiệu','national':'Tổ chức quốc gia','lanhDao':'Ban điều hành','hoatDong':'Tin tức','khuyenHoc':'Khuyến học','coiNguon':'Cội nguồn','danhNhan':'Danh nhân','thanhVien':'Thành viên','join':'Đăng ký tham gia'}
def walk(node,group='Thông tin chung',blocked=False):
    attrs=node['attrs'];group=groups.get(attrs.get('id'),group)
    blocked=blocked or node['tag'] in ['script','style','head'] or attrs.get('id')=='cmsNews' or 'data-cms' in attrs
    text=' '.join(''.join(node['parts']).split())
    chosen=not blocked and text and (node['tag'] in ['h1','h2','h3','h4','p','cite','a'] or node['tag'] in ['div','span'] and all(c['tag']=='br' for c in node['children']))
    def add(kind,value,label,selector=None):
        fields.append({'id':'page-'+str(len(fields)+1),'label':group+' · '+label,'group':group,'default':value,'rows':3,'selector':selector or node['selector'],'kind':kind})
    if chosen:
        add('text',text,text[:75])
        if node['tag']=='a' and attrs.get('href'):add('href',attrs['href'],'Liên kết: '+text[:55])
    if not blocked and node['tag']=='img' and attrs.get('src'):add('src',attrs['src'],'Hình ảnh: '+attrs.get('alt','Ảnh trang chủ'))
    if not blocked and 'leader-placeholder' in attrs.get('class',''):
        parent=node['parent']; name=next((' '.join(''.join(c['parts']).split()) for c in parent['children'] if 'leader-info' in c['attrs'].get('class','')),'Lãnh đạo')
        add('image','', 'Ảnh đại diện: '+name[:50])
    for child in node['children']:walk(child,group,blocked or bool(chosen))
walk(p.tree)
(root/'assets/content-fields.json').write_text(json.dumps(fields,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
quote=lambda s:"'"+s.replace("'","''")+"'"
sql='-- Bổ sung nội dung gốc, không ghi đè nội dung đã sửa.\nbegin;\n'
sql+='insert into public.ldbc_site_content(id,value) values\n'+',\n'.join('('+quote(f['id'])+','+quote(f['default'])+')' for f in fields)+'\non conflict(id) do nothing;\ncommit;\n'
(root/'supabase-content-expanded.sql').write_text(sql,encoding='utf-8')
print('Content fields:',len(fields))
