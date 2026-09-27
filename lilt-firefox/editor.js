(function(root){
  'use strict';
  const blockTags=new Set(['DIV','P','LI','BLOCKQUOTE','H1','H2','H3','PRE']);
  function eligible(node){
    if(!(node instanceof Element)) return null;
    let el=node.closest('input,textarea,[contenteditable="true"],[contenteditable=""],[contenteditable="plaintext-only"]');
    if(!el || el.disabled || el.readOnly || el.closest('[data-lilt-host]')) return null;
    if(el instanceof HTMLInputElement && !['text','search'].includes(el.type)) return null;
    if(el.closest('[contenteditable="false"]')) return null;
    if(el.isContentEditable) while(el.parentElement?.isContentEditable) el=el.parentElement;
    const attrs=['autocomplete','name','id','aria-label','data-testid'].map(x=>el.getAttribute(x)||'').join(' ');
    if(/password|passwd|one.time|\botp\b|\bpin\b|credit.?card|card.?number|cc-|social.?security|\bssn\b|username|user.?name|secret|api.?key/i.test(attrs)) return null;
    if(el.closest('[data-lilt-ignore]')) return null;
    return el;
  }
  function linearize(el){
    const segments=[];let text='';
    function add(value,node,startPoint,endPoint){if(!value)return;segments.push({start:text.length,end:text.length+value.length,node,startPoint,endPoint});text+=value;}
    function walk(parent){
      Array.from(parent.childNodes).forEach((n,i)=>{
        if(n.nodeType===Node.TEXT_NODE) add(n.data,n);
        else if(n.nodeType===Node.ELEMENT_NODE){
          if(n.tagName==='BR') add('\n',null,[parent,i],[parent,i+1]);
          else {
            if(blockTags.has(n.tagName)&&text&&!text.endsWith('\n')) add('\n',null,[parent,i],[n,0]);
            walk(n);
          }
        }
      });
    }
    walk(el);
    function point(offset){
      offset=Math.max(0,Math.min(text.length,offset));
      for(const s of segments){
        if(offset>=s.start&&offset<=s.end){
          if(s.node)return [s.node,offset-s.start];
          return offset===s.start?s.startPoint:s.endPoint;
        }
      }
      return [el,0];
    }
    function offset(node,pos){
      for(const s of segments) if(s.node===node) return s.start+Math.min(pos,s.end-s.start);
      const r=document.createRange();r.setStart(el,0);try{r.setEnd(node,pos);r.collapse(false);}catch{return text.length;}
      // Range.toString omits block separators. Use DOM boundary comparison instead.
      let answer=0;
      for(let i=0;i<=text.length;i++){
        const p=point(i),q=document.createRange();q.setStart(p[0],p[1]);q.collapse(true);
        if(q.compareBoundaryPoints(Range.START_TO_START,r)<=0) answer=i;else break;
      }
      return answer;
    }
    return {text,point,offset};
  }
  function read(el){
    if('value' in el) return {text:el.value,start:el.selectionStart??el.value.length,end:el.selectionEnd??el.value.length};
    const map=linearize(el),sel=getSelection();
    if(!sel?.rangeCount || !el.contains(sel.anchorNode) || !el.contains(sel.focusNode))return {text:map.text,start:map.text.length,end:map.text.length};
    const a=map.offset(sel.anchorNode,sel.anchorOffset),b=map.offset(sel.focusNode,sel.focusOffset);
    return {text:map.text,start:Math.min(a,b),end:Math.max(a,b)};
  }
  function select(el,start,end=start){
    el.focus({preventScroll:true});
    if('value'in el){el.setSelectionRange(start,end);return;}
    const map=linearize(el),a=map.point(start),b=map.point(end),r=document.createRange();r.setStart(...a);r.setEnd(...b);const s=getSelection();s.removeAllRanges();s.addRange(r);
  }
  function replace(el,start,end,value,caret){
    const before=read(el).text,expected=before.slice(0,start)+value+before.slice(end);
    if('value'in el){
      const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el,expected);
      select(el,caret??start+value.length);
      el.dispatchEvent(new InputEvent('input',{bubbles:true,composed:true,inputType:'insertReplacementText',data:value}));
    }else{
      select(el,start,end);
      if(!document.execCommand('insertText',false,value)){
        const s=getSelection(),r=s.getRangeAt(0);r.deleteContents();const n=document.createTextNode(value);r.insertNode(n);
        el.dispatchEvent(new InputEvent('input',{bubbles:true,composed:true,inputType:'insertReplacementText',data:value}));
      }
      select(el,caret??start+value.length);
    }
    return read(el).text===expected;
  }
  root.LiltEditor={eligible,read,select,replace,linearize};
})(globalThis);
