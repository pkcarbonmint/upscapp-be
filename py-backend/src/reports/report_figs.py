import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import plotly.io as pio
import datetime
from datetime import timedelta
from kaleido.scopes.plotly import PlotlyScope
import base64
from textwrap import wrap
from .utils import format_date
from .services import agg_pef_summary,agg_overall,agg_trend,agg_score_bnmark,agg_accuracy_bnmark,agg_technique,agg_subj_analysis,agg_topic_analysis


def pie_perc_graph(response):
        
      progress = round(response[0]["user_score_percent"] or 0,2)
      display_progress = max(0.1111, min(100, progress))
      fig = go.Figure()

      # Add the pie chart with a large hole in the center
      fig.add_trace(go.Pie(values=[display_progress,100 - display_progress],
                      hole=0.80,
                      marker=dict(colors=['blue','white'], line=dict(color='lightblue', width=2)),
                      opacity=0.85, textinfo='none', direction='clockwise',sort=False))
      # fig.update_traces(marker=dict(colors=['blue', 'white']))
      fig.add_annotation(text=f'{progress:.2f}/100',
                    x=0.5, y=0.5,
                    font_size=30,
                    font_weight = "bold",
                    showarrow=False)
      fig.update_layout(
      shapes=[
          dict(
              type="circle",
              xref="paper", yref="paper",
              x0=0.1, y0=0.1,
              x1=0.9, y1=0.9,
              fillcolor="lightblue",
              line_color="lightblue",
          ),
      ],
      showlegend=False,
      width=200, height=1500,
      margin=dict(l=0, r=0, t=0, b=0)
      
  ) 
      # fig.show()
      # plot_img1 = pio.write_image(fig, "./assets/op.png")
      img_bytes = fig.to_image(format="svg", width=300, height=300)
      fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
      return {"perc":progress,"fig":fig1}

def test_specific_pie_perc_graph(response):
        
      progress = round(response["overall_report"]["user_score_percent"],2)
      display_progress = max(0.1111, min(100, progress))
      fig = go.Figure()

      # Add the pie chart with a large hole in the center
      fig.add_trace(go.Pie(values=[display_progress,100 - display_progress],
                      hole=0.80,
                      marker=dict(colors=['blue','white'], line=dict(color='lightblue', width=2)),
                      opacity=0.85, textinfo='none', direction='clockwise',sort=False))
      # fig.update_traces(marker=dict(colors=['blue', 'white']))
      fig.add_annotation(text=f'{progress:.2f}/100',
                    x=0.5, y=0.5,
                    font_size=30,
                    font_weight = "bold",
                    showarrow=False)
      fig.update_layout(
      shapes=[
          dict(
              type="circle",
              xref="paper", yref="paper",
              x0=0.1, y0=0.1,
              x1=0.9, y1=0.9,
              fillcolor="lightblue",
              line_color="lightblue",
          ),
      ],
      showlegend=False,
    #   width=200, height=1500,
      margin=dict(l=0, r=0, t=0, b=0)
      
  ) 
      # fig.show()
      # plot_img1 = pio.write_image(fig, "./assets/op.png")
      img_bytes = fig.to_image(format="svg", width=400, height=400)
      fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
      return {"perc":progress,"fig":fig1}
      
# fl_pie_perc = pie_perc_graph(response= agg_overall)

def qs_ans(response):
        
        # if response == "aggr_overall":
        user_qs_summary = response["full_length_report"]["qs_ans"] 
        tot_qs_att = user_qs_summary['correct_count']+ user_qs_summary['incorrect_count']+ user_qs_summary['unattempted_count']
        attempted = user_qs_summary['correct_count']+ user_qs_summary['incorrect_count']
        # elif response ==   "":
        #   user_qs_summary = response["questions_report"]
        #   tot_qs_att = user_qs_summary['correct']+ user_qs_summary['incorrect']+ user_qs_summary['un_attempted']
        #   attempted = user_qs_summary['correct']+ user_qs_summary['incorrect']
       
        df = pd.DataFrame({'Category': ['Correct', 'Incorrect', 'Unattempted'],'Count': [user_qs_summary['correct_count'], user_qs_summary['incorrect_count'], user_qs_summary['unattempted_count']] 
                        #    if response == agg_overall else [user_qs_summary['correct'], user_qs_summary['incorrect'], user_qs_summary['un_attempted']] 
                           })
        df['x'] = 0

        fig = px.bar(df, x='Count', y='x',color='Category',color_discrete_map={'Correct': '#9EBE5D', 'Incorrect': '#E75D24', 'Unattempted': '#8F97A4'}, orientation='h', width=900, height=200, text='Count')

        fig.update_yaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_xaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_layout(plot_bgcolor='white',font=dict(color='grey'),paper_bgcolor='white',legend_title_text=None,legend=dict(orientation="h",entrywidth=320,font=dict(size=30)),showlegend=False)
        fig.update_traces(textposition='inside',
        insidetextanchor='middle',
        textfont=dict(color='white', size=24))
        # fig.show()
        img_bytes = fig.to_image(format="svg", width=1300, height=250)
        fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
       
        return {"tot_qs":tot_qs_att,"attempted":attempted,"fig":fig1}
# aggr_fl_qs_ans = qs_ans(response=agg_overall)

def qs_mains_ans(response):
    user_qs_summary = response["qs_ans"]
    correct = user_qs_summary.get('correct_count') or 0
    incorrect = user_qs_summary.get('incorrect_count') or 0
    unattempted = user_qs_summary.get('unattempted_count') or 0

    tot_qs_att = correct + incorrect + unattempted
    attempted = correct + incorrect
    # Create DataFrame for 'attempted' and 'unattempted'
    df = pd.DataFrame({
        'Category': ['Attempted', 'Unattempted'],
        'Count': [attempted, user_qs_summary['unattempted_count']]
    })
    
    df['x'] = 0

    # Plotly bar chart
    fig = px.bar(df, x='Count', y='x', color='Category',
                 color_discrete_map={'Attempted': '#9EBE5D', 'Unattempted': '#E75D24'},
                 orientation='h', width=900, height=200, text='Count')

    fig.update_yaxes(showticklabels=False, title=None, showgrid=False, showline=False)
    fig.update_xaxes(showticklabels=False, title=None, showgrid=False, showline=False)
    fig.update_layout(plot_bgcolor='white', font=dict(color='grey'), paper_bgcolor='white',
                      legend_title_text=None, legend=dict(orientation="h", entrywidth=320, font=dict(size=30)),
                      showlegend=False)
    fig.update_traces(textposition='inside', insidetextanchor='middle',
                      textfont=dict(color='white', size=24))

    # Convert plot to image and encode as base64
    img_bytes = fig.to_image(format="svg", width=1200, height=250)
    fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"

    return {"tot_qs": tot_qs_att, "attempted": attempted, "fig": fig1}


def test_specific_q_ans(response):
        
        user_qs_summary = response["questions_report"]
        tot_qs_att = user_qs_summary['correct']+ user_qs_summary['incorrect']+ user_qs_summary['un_attempted']
        attempted = user_qs_summary['correct']+ user_qs_summary['incorrect']
    
        df = pd.DataFrame({'Category': ['Correct', 'Incorrect', 'Unattempted'],'Count': [user_qs_summary['correct'], user_qs_summary['incorrect'], user_qs_summary['un_attempted']]
                        #    if response == agg_overall else [user_qs_summary['correct'], user_qs_summary['incorrect'], user_qs_summary['un_attempted']] 
                           })
        df['x'] = 0

        fig = px.bar(df, x='Count', y='x',color='Category',color_discrete_map={'Correct': '#9EBE5D', 'Incorrect': '#E75D24', 'Unattempted': '#8F97A4'}, orientation='h', width=900, height=200, text='Count')

        fig.update_yaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_xaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_layout(plot_bgcolor='white',font=dict(color='grey'),paper_bgcolor='white',legend_title_text=None,legend=dict(orientation="h",entrywidth=320,font=dict(size=30)),showlegend=False)
        fig.update_traces(textposition='inside',
        insidetextanchor='middle',
        textfont=dict(color='white', size=24))
        # fig.show()
        img_bytes = fig.to_image(format="svg", width=1300, height=250)
        fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
       
        return {"tot_qs":tot_qs_att,"attempted":attempted,"fig":fig1}

def test_specific_mains_q_ans(response):
        
        user_qs_summary = response["questions_report"]
        tot_qs_att = user_qs_summary['correct']+ user_qs_summary['incorrect']+ user_qs_summary['un_attempted']
        attempted = user_qs_summary['correct']+ user_qs_summary['incorrect']
    
        df = pd.DataFrame({'Category': ['Correct', 'Incorrect', 'Unattempted'],'Count': [user_qs_summary['correct'], user_qs_summary['incorrect'], user_qs_summary['un_attempted']]
                        #    if response == agg_overall else [user_qs_summary['correct'], user_qs_summary['incorrect'], user_qs_summary['un_attempted']] 
                           })
        df['x'] = 0

        fig = px.bar(df, x='Count', y='x',color='Category',color_discrete_map={'Correct': '#9EBE5D', 'Incorrect': '#E75D24', 'Unattempted': '#E75D24'}, orientation='h', width=900, height=200, text='Count')

        fig.update_yaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_xaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_layout(plot_bgcolor='white',font=dict(color='grey'),paper_bgcolor='white',legend_title_text=None,legend=dict(orientation="h",entrywidth=320,font=dict(size=30)),showlegend=False)
        fig.update_traces(textposition='inside',
        insidetextanchor='middle',
        textfont=dict(color='white', size=24))
        # fig.show()
        img_bytes = fig.to_image(format="svg", width=1300, height=250)
        fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
       
        return {"tot_qs":tot_qs_att,"attempted":attempted,"fig":fig1}
# aggr_fl_qs_ans = qs_ans(response=agg_overall)

def ts_time(response):
      df2 = pd.DataFrame({
          'Category': ['Others Time', 'Your Time'],
          'Time': [response["user_avg_time_per_question"], response["others_avg_time_per_question"]],
          'x': [0, 1]  # Adjust y values to avoid overlap
      })

      # Use plotly.express to create the bar chart
      fig = px.bar(
          df2,
          x="Time",
          y="x",
          color="Category",
          orientation="h",
          # text="Time",
          # height=450,
          # width=700
          
      )

      # Update the layout and styling
      fig.update_layout(
          plot_bgcolor='white',
          paper_bgcolor='white',
          font=dict(color='grey'),
          legend_title_text=None,
          legend=dict(orientation="h", font = dict(size = 50, color = "black")),
          # width=1200,
          # height=200,
          showlegend=False
      )
      

      fig.update_yaxes(showticklabels=False, title=None, showgrid=False, showline=False)
      fig.update_xaxes(showticklabels=False, title=None, showgrid=False, showline=False)

      # Add annotations for the time next to each bar
      for i, row in df2.iterrows():
          fig.add_annotation(
              x=row['Time'] + 0.1, 
              y=row['x'], 
              text=f"{row['Time']:.2f}sec", 
              showarrow=False, 
              font=dict(color='grey',size=30), 
              
              xanchor='left'
          )
      # fig.show()
      # Convert the figure to an image
      img_bytes = fig.to_image(format="svg", width=800, height=280)
      fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"

      return {"fig": fig1}
# avg_time_taken = ts_time(response= test_rank_perc_time["overall_report"]) 
      

def plot_trend(subject, performance_trend, color,i):
        performance_trend = sorted(performance_trend, key=lambda x: x['test_attempt_date'])
                       
        dates = [(item['test_attempt_date']) for item in performance_trend]
        percentage = [item['percentage'] for item in performance_trend]
        display_dates = [date.split('T')[0] for date in dates]
        colors = ["#3A5BCD","#9EBE5D","#E75D24","#FFD558"]
        lighter_colors = ["#8A9FE3","#C7DC91","#F2A386","#FFEBAC"]
        index = colors.index(color)
        fillcolor = lighter_colors[index]
        fig3 = go.Figure()

        fig3.add_trace(go.Scatter(
            x=dates,
            y=percentage,
            mode='lines+markers',
            name="Test Attempts",
            fill='tozeroy',
            fillcolor= fillcolor ,
            # fillgradient=dict(
            #     type="vertical",
            #     colorscale=[(0.0, color), (0.3, color),(0.5,color),(0.7,"white"), (1.0, "white")],
            # ),
            line=dict(color=color),marker=dict(size=10),
            
        ))
        start_date = (datetime.datetime.now() - datetime.timedelta(days=180))
        end_date = datetime.datetime.now()
    
        # Remove the axis and lines except the trend line
        fig3.update_layout(
            xaxis=dict(range = [start_date, end_date], showgrid=False,zeroline=False, showticklabels=True,linecolor='black',tickvals=display_dates, ticktext=display_dates,tickangle=90),
            yaxis=dict(
            range=[-100, 100],
            tickvals=[-100, -90, -80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
            ticktext=["-100%", '', '', '', '', "-50%", '', '', '', '', 0, '', '', '', '', "50%", '', '', '', '', "100%"],
            showgrid=True,  
            gridcolor='black',  
            gridwidth=1,
            linecolor='black',
            zeroline=False,
            showticklabels=True
        ),
            plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=0, r=0, t=0, b=0),
            showlegend = True,
            legend=dict(
              x=0.75,
              y=-0.4,
              # xanchor='left',
              yanchor='bottom',
              orientation='h'
          )
        )  
        # fig3.show()
        return fig3   
    
def trend_agg(response):
    colors = [
    "#3A5BCD",
    "#9EBE5D",
    "#E75D24",
    "#FFD558",
]
    trend_data = []
    for subject in response:
        for subject_name, details in subject.items():
            for test in details["performance_trend"]:
                test["test_attempt_date_formatted"] = format_date(test["test_attempt_date"])
        latest = round(details['latest'],2)
        change = round(details['change'],2)
        color_index = ((list(subject.keys()).index(subject_name))+1) % 4
        if subject_name == "over_all":
            color_index = 0
       
        trend_fig=plot_trend(subject_name, details['performance_trend'], colors[color_index],list(subject.keys()).index(subject_name))
        img_bytes = trend_fig.to_image(format="svg")
        fig = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"    
            
        trend_data.append({"subject": subject_name, "trend_test_data": details, "latest": latest, "change": change,"fig":fig})
    # print("trend_data", trend_data)      
    return trend_data

def trend_main_agg(response):
    colors = [
        "#3A5BCD",
        "#9EBE5D",
        "#E75D24",
        "#FFD558",
    ]
    trend_data = []
    for subject in response:
        for subject_name, details in subject.items():
            # Format dates
            for test in details["performance_trend"]:
                test["test_attempt_date_formatted"] = format_date(test["test_attempt_date"])
            
            # Calculate values
            latest = round(details['latest'], 2)
            change = round(details['change'], 2)

            # Determine color
            color_index = (list(subject.keys()).index(subject_name) + 1) % 4
            if subject_name == "over_all":
                color_index = 0

            # Create figure (optional)
            trend_fig = plot_trend(subject_name, details['performance_trend'], colors[color_index], color_index)
            img_bytes = trend_fig.to_image(format="svg")
            fig = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"    

            # Append the complete entry
            trend_data.append({
                "subject": subject_name,
                "trend_test_data": details,
                "latest": latest,
                "change": change,
                "fig": fig
            })

    return trend_data

# agg_fl_trend = trend_agg(response=agg_trend)

def score_bnmark(response):

      score_benchmark = [subj for subj in response if (subj["self_subject_score"] != None and subj["subject_name"] != None)]
      subjects = [item['subject_name'] for item in score_benchmark]
      self_scores = [item['self_subject_score'] for item in score_benchmark]
      others_scores = [item['others_subject_score'] for item in score_benchmark]
      score_bnchmark_figs = []

      # Colors
      colors = [
          ('#3A5BCD', '#D8DEF5'), 
          ('#9EBE5D', '#E9F2D5'), 
          ('#E75D24', '#F7E2D9'), 
          ('#FFD558', '#FEF4C3'), 
      ]
      
      for i, subject in enumerate(subjects):
          color_index = (subjects.index(subject)) % 4

          fig = go.Figure()
          fig.add_trace(go.Bar(
              y=[f"{'<br>'.join(wrap(subject, 30))}&nbsp;"],
              x=[others_scores[i]],
              name=f'Others score',
              orientation='h',
              width=0.3,
              marker=dict(color=colors[color_index][1],cornerradius="5%")
          ))
          fig.add_trace(go.Bar(
              y=[f"{'<br>'.join(wrap(subject, 30))}&nbsp;"],
              x=[self_scores[i]],
              name=f'Your score',
              orientation='h',
              width=0.2,
              marker=dict(color=colors[color_index][0],cornerradius="5%")
          ))
          fig.update_layout(
          barmode='overlay',
          height=200,
          margin=dict(l=100, r=20, t=50, b=20),
          plot_bgcolor='white',
          xaxis=dict(showgrid=False,
          ticksuffix="%",
          zeroline=True,
          zerolinecolor='grey',
          zerolinewidth=1),
          yaxis=dict(showgrid=False),
          # showlegend=False
          legend=dict(
              orientation='h',
              yanchor='top',
              y=-0.2,
              xanchor='center',
              x=0.5
          )
      )
          img_bytes = fig.to_image(format="svg", width=500, height=250)
          fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
          score_bnchmark_figs.append(fig1)
      return score_bnchmark_figs

def score_paper_bnmark(response):

      score_benchmark = [subj for subj in response if (subj["self_paper_score"] != None and subj["paper_name"] != None)]
      subjects = [item['paper_name'] for item in score_benchmark]
      self_scores = [item['self_paper_score'] for item in score_benchmark]
      others_scores = [item['others_paper_score'] for item in score_benchmark]
      score_bnchmark_figs = []

      # Colors
      colors = [
          ('#3A5BCD', '#D8DEF5'), 
          ('#9EBE5D', '#E9F2D5'), 
          ('#E75D24', '#F7E2D9'), 
          ('#FFD558', '#FEF4C3'), 
      ]
      
      for i, subject in enumerate(subjects):
          color_index = (subjects.index(subject)) % 4

          fig = go.Figure()
          fig.add_trace(go.Bar(
              y=[f"{'<br>'.join(wrap(subject, 30))}&nbsp;"],
              x=[others_scores[i]],
              name=f'Others score',
              orientation='h',
              width=0.3,
              marker=dict(color=colors[color_index][1],cornerradius="5%")
          ))
          fig.add_trace(go.Bar(
              y=[f"{'<br>'.join(wrap(subject, 30))}&nbsp;"],
              x=[self_scores[i]],
              name=f'Your score',
              orientation='h',
              width=0.2,
              marker=dict(color=colors[color_index][0],cornerradius="5%")
          ))
          fig.update_layout(
          barmode='overlay',
          height=200,
          margin=dict(l=100, r=20, t=50, b=20),
          plot_bgcolor='white',
          xaxis=dict(showgrid=False,
          ticksuffix="%",
          zeroline=True,
          zerolinecolor='grey',
          zerolinewidth=1),
          yaxis=dict(showgrid=False),
          # showlegend=False
          legend=dict(
              orientation='h',
              yanchor='top',
              y=-0.2,
              xanchor='center',
              x=0.5
          )
      )
          img_bytes = fig.to_image(format="svg", width=500, height=250)
          fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
          score_bnchmark_figs.append(fig1)
      return score_bnchmark_figs

# agg_score_benchmark = score_bnmark(response=agg_score_bnmark)  

def accu_benchmark(response):
        response = [subj for subj in response if (subj["self_subject_score"] != None and subj["subject_name"] != None)]
        subjects=[]
        self_scores =[]
        others_scores=[]
        for item in response:
            subjects.append(item['subject_name']), 
            self_scores.append(item['self_subject_score']),
            others_scores.append(item['others_subject_score']),
            acc_bnchmark_figs = []
        # Colors
        colors = [
          ('#3A5BCD', '#D8DEF5'), 
          ('#9EBE5D', '#E9F2D5'), 
          ('#E75D24', '#F7E2D9'), 
          ('#FFD558', '#FEF4C3'), 
        ]

        
        for i, subject in enumerate(subjects):
            color_index = (subjects.index(subject)) % 4
            fig = go.Figure()
            fig.add_trace(go.Bar(
                y=[f"{'<br>&nbsp;'.join(wrap(subject, 30))}&nbsp;"],
                x=[others_scores[i]],
                name=f'Others score',
                orientation='h',
                width=0.3,
                marker=dict(color=colors[color_index][1],cornerradius="5%")
            ))
            fig.add_trace(go.Bar(
                y=[f"{'<br>&nbsp;'.join(wrap(subject, 30))}&nbsp;"],
                x=[self_scores[i]],
                name=f'Your score',
                orientation='h',
                width=0.2,
                marker=dict(color=colors[color_index][0],cornerradius="5%")
            ))
            fig.update_layout(
            barmode='overlay',
            height=200,
            margin=dict(l=100, r=20, t=50, b=20),
            plot_bgcolor='white',
            xaxis=dict(showgrid=False,
            ticksuffix="%",
            zeroline=True,
            zerolinecolor='grey',
            zerolinewidth=1),
            yaxis=dict(showgrid=False),
            # showlegend=False
            legend=dict(
                orientation='h',
                yanchor='top',
                y=-0.2,
                xanchor='center',
                x=0.5
            )
        )
            img_bytes = fig.to_image(format="svg", width=500, height=250)
            fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
            acc_bnchmark_figs.append(fig1)

        return acc_bnchmark_figs
            
# agg_acc_bnchmark = accu_benchmark(response=agg_accuracy_bnmark)

def eli_perf_tech(response):
        if response:
            # Calculate totals
            total_correct = sum(item['correct'] for item in response)
            total_incorrect = sum(item['incorrect'] for item in response)
            total_answers = sum(item.get('total_answers', item.get('total_qs', 0)) for item in response)
            total_marks_acquired = sum(item['marks_acquired'] for item in response)

            # Append the total row
            response.append({
                "techique": "Total",
                "total_answers": total_answers,
                "correct": total_correct,
                "incorrect": total_incorrect,
                "unattempted": "",
                "marks_acquired": total_marks_acquired,
                "accuracy_percent": "",
                "effectiveness": "",
                "Remarks": ""
            })

            # Prepare table data
            header = [" ", 'No. of Correct\nAnswers', "No. of Wrong\nAnswers", "Total No. of\nAnswers", "Marks Acquired", "Effectiveness", "Remarks"]
        
            return {"header":header,"resp":response}
        else:
             return response
# eli_perf_tec = eli_perf_tech(response=ele_tech_resp)

def subj_wise_ana(response):
        header = ['Subject', 'Correctly answered', 'InCorrectly answered', 'Not attempted', 'Total Questions', 'Total Marks', 'Strength']
        map_color = {"low": "#FD2727", "medium": "#FFBF00", "high": "#9EBE5D", "very high": "#4E6918"}

        # Split the response into chunks
        chunk_size = 6  # Number of rows per chunk
        chunks = [response[i:i + chunk_size] for i in range(0, len(response), chunk_size)]

        images = []
        def wrap_text(text, width):
         return ('<br>'.join(wrap(text, width)))

        for chunk in chunks:
            cells = [
                [f'<b>{wrap_text(item["subject_name"], 30)}</b><br>Importance: {item["min_qs"]} to {item["max_qs"]} qns.<br> come from this subject'
                for item in chunk ],
                [item["correct"] for item in chunk],
                [item["incorrect"] for item in chunk],
                [(item["tq_count"] - (item["correct"] + item["incorrect"])) for item in chunk],
                [item["tq_count"] for item in chunk],
                [round(item["marks_acquired"], 2) for item in chunk],
                [item["score_category"] for item in chunk]
            ]

            effectiveness_colors = [map_color.get(item["score_category"], "black") for item in chunk]

            num_rows = len(chunk)
            row_height = 100  # Height of each row in pixels
            header_height = 70  # Height of the header in pixels
            total_height = num_rows * row_height + header_height +40

            fig = go.Figure(data=[go.Table(
                columnwidth=[160, 80, 95, 85, 80, 75, 75],
                header=dict(values=header, line_color='paleturquoise', fill_color="paleturquoise", align='left', height=70, font=dict(color='black')),
                cells=dict(values=cells,  line_color='lavender', fill_color="lavender", align='left', height=100, font=dict(color=[
                    ['black'] * num_rows,
                    ['black'] * num_rows,
                    ['black'] * num_rows,
                    ['black'] * num_rows,
                    ['black'] * num_rows,
                    ['black'] * num_rows,
                    effectiveness_colors,
                ]))
            )])
            shapes = []
                        # Add outer border
            shapes.append(dict(
                type="rect",
                xref="paper", yref="paper",
                x0=0, y0=0, x1=1, y1=1,
                line=dict(color="blue", width=2),
            ))



            # Add row lines
            for i in range(1, num_rows + 1):
                shapes.append(dict(
                    type="line",
                    xref="paper", yref="paper",
                    x0=0, y0=(1.2 - i / (num_rows + 1)), x1=1, y1=(1.2 - i / (num_rows + 1)),
                    line=dict(color="blue", width=1),
                ))

            fig.update_layout(
                autosize=True,
                height=total_height,
                margin=dict(l=10, r=10, b=10, t=10),
                shapes=shapes
            )
            img_bytes = fig.to_image(format="svg", width=770, height = total_height)
            fig1 = f"data:image/svg;base64,{base64.b64encode(img_bytes).decode('utf8')}"
            images.append(fig1)

            # fig.show()
        return images
    
# subj_wise_ana = subj_ana(response=subj_wise_resp)

def q_bank_qs_ans(response,mode):
        
        user_qs_summary = response["q_bank_report"]["qs_summary"]
        used_exam_qs = user_qs_summary["used_exam_qs"] 
        used_tutor_qs = user_qs_summary["used_tutor_qs"] 

        if mode == "EXAM":

          df = pd.DataFrame({'Category': ['Used Questions in test mode', 'Unused Questions in test mode'],'Count': [used_exam_qs, user_qs_summary['unused_exam_qs']]})
          df['x'] = 0
          fig = px.bar(df, x='Count', y='x',color='Category',color_discrete_map={'Used Questions in test mode': 'orangered', 'Unused Questions in test mode': '#8F97A4'}, orientation='h', text='Count')
        else:
          df = pd.DataFrame({'Category': ['Used Questions in tutor mode', 'Unused Questions in tutor mode'],'Count': [used_tutor_qs, user_qs_summary['unused_tutor_exam']]})
          df['x'] = 0
          fig = px.bar(df, x='Count', y='x',color='Category',color_discrete_map={'Used Questions in tutor mode': 'limegreen', 'Unused Questions in tutor mode': '#8F97A4'}, orientation='h', text='Count')
                     

        fig.update_yaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_xaxes(showticklabels=False, title=None,showgrid=False,
            showline=False)
        fig.update_layout(plot_bgcolor='#F2F4FA',font=dict(color='grey'), paper_bgcolor='#F2F4FA',legend_title_text=None,legend=dict(orientation="h",entrywidth=400,font=dict(size=25)))
        fig.update_traces(textposition='inside',
        insidetextanchor='middle',
        textfont=dict(color='white', size=22))
        # fig.show()
        img_bytes = fig.to_image(format="svg", width=1050, height=210)
        fig1 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
       
        return {"tutor_used":user_qs_summary["used_exam_qs"] + user_qs_summary["unused_exam_qs"],"exam_used":user_qs_summary["used_tutor_qs"] + user_qs_summary["unused_tutor_exam"]
,"fig":fig1}
    
# qb_exam_qs = qb_qs_ans(response=qb_qs_ans, mode="EXAM")  
# qb_tutor_qs = qb_qs_ans(response=qb_qs_ans, mode="TUTOR")

#Mains plots

import plotly.express as px
import pandas as pd
import base64

# def score_summary(response):
#     score_data = response["score_summary"]
    
#     df = pd.DataFrame({
#         "Metric": ["Average Score/test", "Lowest Score/test", "Highest Score/test"],
#         "Score": [
#             score_data["average_score"],
#             score_data["lowest_score"],
#             score_data["highest_score"]
#         ]
#     })
#     df["y"] = 0  # for horizontal bar layout

#     fig = px.bar(
#         df,
#         x="Score",
#         y="y",
#         color="Metric",
#         color_discrete_map={
#             "Average Score/test": "#3A5BCD80",
#             "Lowest Score/test": " #AFB6BF",
#             "Highest Score/test": "#D8DEF5"
#         },
#         orientation="h",
#         width=900,
#         height=200,
#         text="Score"
#     )

#     fig.update_yaxes(showticklabels=False, title=None, showgrid=False, showline=False)
#     fig.update_xaxes(showticklabels=False, title=None, showgrid=False, showline=False)

#     fig.update_layout(
#         plot_bgcolor='white',
#         paper_bgcolor='white',
#         font=dict(color='grey'),
#         legend_title_text=None,
#         showlegend=False
#     )

#     fig.update_traces(
#         textposition='inside',
#         insidetextanchor='middle',
#         textfont=dict(color='white', size=24)
#     )

#     img_bytes = fig.to_image(format="svg", width=1300, height=250)
#     fig_svg = f"data:image/svg+xml;base64,{base64.b64encode(img_bytes).decode('utf8')}"

#     return {"fig": fig_svg}


def score_summary(response):
    score_data = response["score_summary"]
    highest_score = score_data.get("highest_score") or 0
    average_score = score_data.get("average_score") or 0
    lowest_score = score_data.get("lowest_score") or 0

     # for horizontal bar layout

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=[highest_score],
        name=f'Highest Score/test',
        orientation='h',
        width=0.5,
        showlegend=False,
        marker=dict(color= 'rgb(209, 238, 248)',cornerradius="5%"),
        text=[f"{highest_score:.2f}"],
        textposition='outside',
        textfont=dict(size=14, color='black')
    ))
    fig.add_trace(go.Bar(
       
         x=[average_score],
        name=f'Average Score/test',
        orientation='h',
        width=0.35,
        showlegend=False,
        marker=dict(color='rgb(168, 160, 160)',cornerradius="5%"),
        text=[f"{average_score:.2f}"],
        textposition='outside',
        textfont=dict(size=14, color='black')
    ))
    fig.add_trace(go.Bar(
        x=[lowest_score],
        name=f'Lowest Score/test',
        orientation='h',
        width=0.2,
        showlegend=False,
        marker=dict(color= 'rgb(145, 145, 248)',cornerradius="5%"),
        text=[f"{lowest_score:.2f}"],
        textposition='outside',
        textfont=dict(size=14, color='black')
    ))
    
    
    fig.update_layout(
    barmode='overlay',
    height=200,
    margin=dict(l=100, r=20, t=50, b=20),
    plot_bgcolor='white',
    xaxis=dict(showgrid=False,
#    showticklabels=False,
    zeroline=True,
    zerolinecolor='white',
    zerolinewidth=1),
    yaxis=dict(showgrid=False,showticklabels=False),
    # showlegend=False
    legend=dict(
        orientation='h',
        yanchor='top',
        y=-0.2,
        xanchor='center',
        x=0.5
    )
)
    img_bytes = fig.to_image(format="svg", width=700, height=250)
    fig_svg = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
    return {"fig": fig_svg}

def test_sp_score_summary(response):
    score_data = response
     # for horizontal bar layout
    print("scores>>>>>>>>>>>>", score_data["your_score"],score_data["avg_score"],score_data["topper_score"])

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=[score_data["topper_score"]],
        name=f'Topper',
        orientation='h',
        width=0.5,
        showlegend=False,
        marker=dict(color= 'rgb(209, 238, 248)',cornerradius="5%"),
        text=[f"{score_data['topper_score']}"],
        textposition='outside',
        textfont=dict(size=14, color='black')
    ))
    fig.add_trace(go.Bar(
        x=[score_data["avg_score"]],
        name=f'Average',
        orientation='h',
        width=0.35,
        showlegend=False,
        marker=dict(color='rgb(168, 160, 160)',cornerradius="5%"),
        text=[f"{score_data['avg_score']}"],
        textposition='outside',
        textfont=dict(size=14, color='black')
    ))
    fig.add_trace(go.Bar(
        x=[score_data["your_score"]],
        name=f'Your Score',
        orientation='h',
        width=0.2,
        showlegend=False,
        marker=dict(color= 'rgb(145, 145, 248)',cornerradius="5%"),
        text=[f"{score_data['your_score']}"],
        textposition='outside',
        textfont=dict(size=14, color='black')
    ))
    
    
    fig.update_layout(
    barmode='overlay',
    height=150,
    margin=dict(l=100, r=20, t=50, b=20),
    plot_bgcolor='white',
    xaxis=dict(showgrid=False,
   showticklabels=False,
    zeroline=True,
    zerolinecolor='grey',
    zerolinewidth=1),
    yaxis=dict(showgrid=False,showticklabels=False),
    # showlegend=False
    legend=dict(
        orientation='h',
        yanchor='top',
        y=-0.2,
        xanchor='center',
        x=0.5
    )
)   

    img_bytes = fig.to_image(format="svg", width=700, height=150)
    fig_svg = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf8')}"
    return {"fig": fig_svg}